// Curated directory tool. Hand-written; merges four generated tools
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
      + "- `whoami` — return the authenticated user's identity (decoded from "
      + "the bearer JWT). No other args needed.\n"
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
  \`get_user\` on themselves).
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
        return jsonResult({
          userId: claims["userId"],
          orgId: claims["orgId"],
          email: claims["email"],
          fullName: claims["fullName"],
          mobile: claims["mobile"],
          userSlug: claims["userSlug"],
        });
      }

      case "list_users": {
        const [result] = await usersGetAllUsers(client, {
          page: args.page,
          limit: args.limit,
          search: args.search,
        }, { fetchOptions }).$inspect();
        if (!result.ok) return errorResult(result.error.message);
        const parsed = await readJson(result.value);
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
        const parsed = await readJson(result.value);
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
        const parsed = await readJson(result.value);
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
        const parsed = await readJson(result.value);
        if (!parsed.ok) return parsed.result;
        return jsonResult(parsed.value);
      }
    }
  },
};
