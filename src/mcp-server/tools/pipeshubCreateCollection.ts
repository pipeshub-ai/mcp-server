// pipeshub_create_collection — `POST /knowledgeBase`: a new, empty collection
// owned by the caller, ready for pipeshub_upload.

import * as z from "zod";
import { knowledgeBaseCreate } from "../../funcs/knowledgeBaseWrite.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, jsonResult, readJson } from "./_helpers.js";
import { webOrigin } from "./_writeHelpers.js";

const args = {
  name: z.string().trim().min(1).max(255).describe(
    "Name for the new collection, e.g. \"Project docs\". Names need not be unique.",
  ),
};

export const tool$pipeshubCreateCollection: ToolDefinition<typeof args> = {
  name: "pipeshub_create_collection",
  description:
    `Create an empty **collection** (a knowledge base the user owns) to upload
documents into. To add to an existing one, use its id from \`pipeshub_sources\`
(\`kind: "knowledgeBase"\`): names are not unique, so calling again makes a
second collection. Returns \`{ collectionId, name, url }\`. Next:
\`pipeshub_upload\`, then \`pipeshub_indexing_status\`, then search.`,
  scopes: ["write"],
  annotations: {
    title: "Create a PipesHub collection",
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    readOnlyHint: false,
  },
  args,
  tool: async (client, args, ctx) => {
    const r = await knowledgeBaseCreate(
      client,
      args.name,
      { fetchOptions: { signal: ctx.signal } },
    );
    if (!r.ok) return errorResult(`Create collection: ${r.error.message}`);
    const httpErr = await httpErrorResult(r.value, "Create collection");
    if (httpErr) return httpErr;
    const body = await readJson<{ id?: string; name?: string }>(r.value, "Create collection");
    if (!body.ok) return body.result;
    if (!body.value.id) return errorResult("Create collection: the response carried no collection id.");
    return jsonResult({
      collectionId: body.value.id,
      name: body.value.name ?? args.name,
      url: `${webOrigin(client)}/knowledge-base?nodeType=app&nodeId=${encodeURIComponent(body.value.id)}`,
    });
  },
};
