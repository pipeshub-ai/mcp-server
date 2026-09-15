// (`pipeshub-list-users`, `pipeshub-get-user`, `pipeshub-list-user-groups`,
// `pipeshub-list-my-teams`) plus a `whoami` action that decodes the bearer
// JWT into a single tool.

import * as z from "zod";
import { usersGetAllUsers } from "../../funcs/usersGetAllUsers.js";
import { usersGetUserById } from "../../funcs/usersGetUserById.js";
import { userGroupsGetAllUserGroups } from "../../funcs/userGroupsGetAllUserGroups.js";
import { teamsGetUserTeams } from "../../funcs/teamsGetUserTeams.js";
import { GetAllUsersRequest$zodSchema } from "../../models/getallusersop.js";
import { GetAllUserGroupsRequest$zodSchema } from "../../models/getallusergroupsop.js";
import { GetUserTeamsRequest$zodSchema } from "../../models/getuserteamsop.js";
import { ToolDefinition } from "../tools.js";
import {
  decodeBearer,
  errorResult,
  jsonResult,
  expiredTokenError,
  readJson,
} from "./_helpers.js";

function defaultLimit(
  schema: { parse: (value: Record<string, never>) => { limit?: number } },
): number {
  const limit = schema.parse({}).limit;
  if (typeof limit !== "number") {
    throw new Error("list request schema is missing a numeric limit default");
  }
  return limit;
}

const listUsersLimit = defaultLimit(GetAllUsersRequest$zodSchema);
const listGroupsLimit = defaultLimit(GetAllUserGroupsRequest$zodSchema);
const listTeamsLimit = defaultLimit(GetUserTeamsRequest$zodSchema);

const args = {
  action: z.enum([
    "whoami",
    "list_users",
    "get_user",
    "list_groups",
    "list_my_teams",
  ]).describe(
    "What to do:\n"
      + "- `whoami` — return the authenticated user's identity, confirmed "
      + "against the server. No other args needed.\n"
      + "- `list_users` — paginated list of org users. Optional `page`, "
      + "`limit`, `search` (substring match against name or email).\n"
      + "- `get_user` — full profile for one user. Required `userId`. "
      + "Use `whoami` to find your own id first if needed.\n"
      + "- `list_groups` — paginated list of user groups (with `userCount`). "
      + "Optional `search` matches group name.\n"
      + "- `list_my_teams` — teams the authenticated user belongs to, with "
      + "capability flags. Optional `search` matches team name.",
  ),
  userId: z.string().optional().describe(
    "Required when `action` is `get_user`. 24-character ObjectId. "
      + "Take it from `whoami` (yourself) or from a `list_users` hit.",
  ),
  page: z.number().int().min(1).optional().describe(
    "1-based page for list_* actions. Omit for page 1.",
  ),
  limit: z.number().int().min(1).max(100).optional().describe(
    "Items per page for list_* (1–100). Omit for the action default: "
      + `${listUsersLimit} users, ${listGroupsLimit} groups, `
      + `${listTeamsLimit} teams.`,
  ),
  search: z.string().optional().describe(
    "Substring match on list_users (name or email), list_groups (name), "
      + "and list_my_teams (name). An empty list means no match, not an error.",
  ),
};

export const tool$pipeshubDirectory: ToolDefinition<typeof args> = {
  name: "pipeshub_directory",
  description:
    `Look up people, groups, and teams in PipesHub. Five actions — pick
\`action\`. Not for documents or files: that is \`pipeshub_search\`.

- \`whoami\` — the caller's id, email, full name. Use before \`get_user\`
  on yourself. Errors if the credential is expired or revoked.
- \`list_users\` — page org users; \`search\` matches name or email.
- \`get_user\` — full \`User\` for one \`userId\`.
- \`list_groups\` — org groups with \`userCount\`; \`search\` matches name.
- \`list_my_teams\` — teams the caller is on, with \`canEdit\` /
  \`canDelete\` / \`canManageMembers\`; \`search\` matches name.

Omit \`page\`/\`limit\` for the first page (\`page\` 1). No match is an
empty \`users\`/\`groups\`/\`teams\` array, not an error.
\`pagination.hasNextPage\` (teams: \`hasNext\`) says whether to request
the next page.`,
  scopes: ["read"],
  annotations: {
    title: "PipesHub directory (users / groups / teams / whoami)",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const fetchOptions = { signal: ctx.signal };

    switch (args.action) {
      case "whoami": {
        const claims = await decodeBearer(client);
        if (!claims) {
          return errorResult(
            "No bearer token configured on the SDK client, so `whoami` "
              + "cannot resolve the caller's identity. Ask the user for "
              + "their email and use `list_users` with `search`.",
          );
        }
        // The claims come out of the local token, which proves nothing about
        // whether the server still accepts it — a revoked token carries a
        // perfectly good name and org. Since whoami is the command people run
        // to check "is my login working?", answering from the token alone
        // gives a confident yes in exactly the case that matters.
        //
        // Expiry is checkable offline, so check it first: it is the common
        // case and costs no round-trip.
        const exp = claims["exp"];
        const expired = expiredTokenError(exp);
        if (expired) return expired;
        const tokenExpiresAt = typeof exp === "number"
          ? new Date(exp * 1000).toISOString()
          : undefined;

        // Revocation can only be established by asking the server. get_user on
        // the caller's own id needs `user:read`, which whoami's callers already
        // hold, and returns 401 for a rejected credential.
        const userId = claims["userId"];
        let verified: true | "unchecked" = "unchecked";
        let unverifiedReason: string | undefined =
          "No userId claim in the token, so the identity could not be "
          + "confirmed with the server.";

        if (typeof userId === "string" && userId) {
          const [probe] = await usersGetUserById(client, { id: userId }, {
            fetchOptions,
          }).$inspect();

          if (!probe.ok) {
            unverifiedReason = `Could not reach PipesHub to confirm the `
              + `identity (${probe.error.message}). The details below come `
              + `from the token itself.`;
          } else if (probe.value.status === 401) {
            return errorResult(
              "PipesHub rejected this access token (HTTP 401 Unauthorized), "
                + "so the identity in it is no longer valid — it has most "
                + "likely been revoked. Mint a new personal access token "
                + "under Developer Settings → Personal Access Tokens.",
            );
          } else if (probe.value.ok) {
            verified = true;
            unverifiedReason = undefined;
          } else {
            unverifiedReason = `PipesHub returned HTTP ${probe.value.status} `
              + `when confirming the identity, so it could not be checked. `
              + `The details below come from the token itself.`;
          }
        }

        return jsonResult({
          userId: claims["userId"],
          orgId: claims["orgId"],
          email: claims["email"],
          fullName: claims["fullName"],
          mobile: claims["mobile"],
          userSlug: claims["userSlug"],
          tokenExpiresAt,
          // Never `false`: that reads as "the server rejected this identity",
          // which is a different and much more alarming claim than "this was
          // not checked". A rejection returns an error above instead.
          identityVerified: verified,
          note: unverifiedReason,
        });
      }

      case "list_users": {
        const [result] = await usersGetAllUsers(client, {
          page: args.page,
          limit: args.limit,
          search: args.search,
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        const parsed = await readJson(result.value, "User listing");
        if (!parsed.ok) return parsed.result;
        return jsonResult(parsed.value);
      }

      case "get_user": {
        if (!args.userId) {
          return errorResult(
            "`userId` is required when `action` is `get_user`. "
              + "Use `whoami` to find your own id, or `list_users` "
              + "to look up by name / email.",
          );
        }
        const [result] = await usersGetUserById(client, {
          id: args.userId,
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        const parsed = await readJson(result.value, "User lookup");
        if (!parsed.ok) return parsed.result;
        return jsonResult(parsed.value);
      }

      case "list_groups": {
        const [result] = await userGroupsGetAllUserGroups(client, {
          page: args.page,
          limit: args.limit,
          search: args.search,
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        const parsed = await readJson(result.value, "Group listing");
        if (!parsed.ok) return parsed.result;
        return jsonResult(parsed.value);
      }

      case "list_my_teams": {
        const [result] = await teamsGetUserTeams(client, {
          page: args.page,
          limit: args.limit,
          search: args.search,
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        const parsed = await readJson(result.value, "Team listing");
        if (!parsed.ok) return parsed.result;
        return jsonResult(parsed.value);
      }
    }
  },
};
