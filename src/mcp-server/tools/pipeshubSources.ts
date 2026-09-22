import * as z from "zod";
import { aiModelsProvidersGetAvailableModelsByType } from "../../funcs/aiModelsProvidersGetAvailableModelsByType.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  jsonResult,
  listAllSources,
  readJson,
} from "./_helpers.js";

const args = {
  include: z.array(z.enum(["sources", "llmModels", "embeddingModels"]))
    .optional()
    .describe(
      "Which sections to fetch. Default: `[\"sources\", \"llmModels\"]`. "
        + "Add `embeddingModels` if the user is configuring re-embedding.",
    ),
};

export const tool$pipeshubSources: ToolDefinition<typeof args> = {
  name: "pipeshub_sources",
  description:
    `Discover available chat sources and AI models in one call.

Returns up to three sections:

- \`sources\` — connectors (\`kind: "connector"\`) and collections
  (\`kind: "knowledgeBase"\`). For \`pipeshub_search\` and
  \`pipeshub_chat\`, put a connector \`id\` in \`apps\` and a collection
  \`id\` in \`kb\`. \`sourcesTruncated: true\` means the list stopped at
  1,000 sources.
- \`llmModels\` — chat / generation models. Each item's \`modelKey\`
  is the value to pass on \`pipeshub_chat\` as \`modelKey\`. Pick
  \`isDefault: true\` unless the user asks for a specific model.
- \`embeddingModels\` — vector embedding models (only fetched when
  explicitly requested via \`include\`).

Call this once at the start of a session and cache the result —
sources and models change infrequently.`,
  scopes: ["read"],
  annotations: {
    title: "List PipesHub sources and AI models",
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  args,
  tool: async (client, args, ctx) => {
    const fetchOptions = { signal: ctx.signal };
    const include = args.include
      ?? (["sources", "llmModels"] as const);
    const want = (s: string) => (include as readonly string[]).includes(s);

    const result: Record<string, unknown> = {};

    if (want("sources")) {
      const listed = await listAllSources(client, { signal: ctx.signal });
      if (!listed.ok) return listed.result;
      result["sources"] = listed.sources;
      if (listed.truncated) result["sourcesTruncated"] = true;
    }

    for (
      const [key, modelType] of [
        ["llmModels", "llm"] as const,
        ["embeddingModels", "embedding"] as const,
      ]
    ) {
      if (!want(key)) continue;
      const [r] = await aiModelsProvidersGetAvailableModelsByType(client, {
        modelType,
      }, { fetchOptions }).$inspect();
      if (!r.ok) return errorResult(`${key}: ${r.error.message}`);
      // Named per listing: both the chat and the embedding models are fetched
      // here, so a bare "Model listing failed" leaves the reader unable to tell
      // which of the two is unavailable.
      const parsed = await readJson<{ models?: any[] }>(r.value, `${key} listing`);
      if (!parsed.ok) return parsed.result;
      result[key] = (parsed.value.models ?? []).map((m: any) => ({
        modelKey: m.modelKey,
        modelName: m.modelName,
        provider: m.provider,
        isDefault: m.isDefault,
        isMultimodal: m.isMultimodal,
        isReasoning: m.isReasoning,
      }));
    }

    return jsonResult(result);
  },
};
