// (`pipeshub-list-users`, `pipeshub-get-user`, `pipeshub-list-user-groups`,
// `pipeshub-list-my-teams`) plus a `whoami` action that decodes the bearer
// JWT into a single tool.

import * as z from "zod";
import { usersGetAllUsers } from "../../funcs/usersGetAllUsers.js";
import { usersGetUserById } from "../../funcs/usersGetUserById.js";
import { userGroupsGetAllUserGroups } from "../../funcs/userGroupsGetAllUserGroups.js";
import { teamsGetUserTeams } from "../../funcs/teamsGetUserTeams.js";
import { ToolDefinition } from "../tools.js";
import {
  decodeBearer,
  errorResult,
  jsonResult,
  expiredTokenError,
  readJson,
} from "./_helpers.js";

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
      + "- `list_groups` — paginated list of user groups (with `userCount`).\n"
      + "- `list_my_teams` — teams the authenticated user belongs to, with "
      + "capability flags.",
  ),
  userId: z.string().optional().describe(
    "Required when `action` is `get_user`. 24-character ObjectId.",
  ),
  page: z.number().int().min(1).optional().describe(
    "Pagination — 1-based page number. Used by list_* actions.",
  ),
  limit: z.number().int().min(1).max(100).optional().describe(
    "Pagination — items per page. Used by list_* actions.",
  ),
  search: z.string().optional().describe(
    "Substring match against name / email. Used by list_users.",
  ),
};

export const tool$pipeshubDirectory: ToolDefinition<typeof args> = {
  name: "pipeshub_directory",
  description:
    `Look up people, groups, and teams in PipesHub. One tool with five
actions — pick the right \`action\`:

- \`whoami\` — who is the caller?  Use this whenever you need the
  authenticated user's own id, email, or full name (e.g. before
  \`get_user\` on themselves). Errors if the credential is expired
  or revoked.
- \`list_users\` — search / page through org users.
- \`get_user\` — full \`User\` document for one user (requires \`userId\`).
- \`list_groups\` — list user groups with \`userCount\`.
- \`list_my_teams\` — teams the caller belongs to, with capability flags
  (\`canEdit\` / \`canDelete\` / \`canManageMembers\`).

Output shape varies by action; see each action's docs above.`,
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
              "PipesHub rejected this access token, so the identity in it is "
                + "no longer valid — it has most likely been revoked. Mint a "
                + "new personal access token under Developer Settings → "
                + "Personal Access Tokens.",
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
