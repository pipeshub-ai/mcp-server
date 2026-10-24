// pipeshub_connect_source — connectors need the user's own sign-in in a
// browser, so this hands back the page to do it on. It writes nothing.

import * as z from "zod";
import { ToolDefinition } from "../tools.js";
import { jsonResult } from "./_helpers.js";
import { webOrigin } from "./_writeHelpers.js";

const args = {
  connector: z.string().trim().min(1).max(64).optional().describe(
    "Connector to open directly, as PipesHub names it, e.g. \"Jira\", \"Confluence\", "
      + "\"Slack\", \"Drive\". Omit to open the full connector list.",
  ),
};

export const tool$pipeshubConnectSource: ToolDefinition<typeof args> = {
  name: "pipeshub_connect_source",
  description:
    `Link for the user to connect a source (Slack, Google Drive, Jira,
Confluence, GitHub, 50+ more). It needs their own sign-in in a browser, so give
them \`url\` (\`adminUrl\` to connect for the whole org), then check
\`pipeshub_sources\`. For files you already have, use \`pipeshub_upload\`.
Returns \`{ url, adminUrl, instructions }\`. Never ask for a password or token
in chat.`,
  scopes: ["read"],
  annotations: {
    title: "Link to connect a source to PipesHub",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args) => {
    // Link to the scoped pages directly: /workspace/connectors redirects there
    // and drops the query, so a connectorType would be lost on the way.
    const link = (scope: "personal" | "team") => {
      const url = new URL(`/workspace/connectors/${scope}/`, webOrigin(client));
      if (args.connector) url.searchParams.set("connectorType", args.connector);
      return url.toString();
    };
    return jsonResult({
      url: link("personal"),
      adminUrl: link("team"),
      instructions:
        "Open `url` signed in to PipesHub and sign in to the connector: it indexes what that user can see."
          + " An admin connecting for the whole organization uses `adminUrl` instead."
          + " Syncing starts right after and can take minutes to hours for large sources.",
    });
  },
};
