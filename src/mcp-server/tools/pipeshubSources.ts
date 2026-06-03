import * as z from "zod";
import { knowledgeHubGetKnowledgeHubRootNodes } from "../../funcs/knowledgeHubGetKnowledgeHubRootNodes.js";
import { aiModelsProvidersGetAvailableModelsByType } from "../../funcs/aiModelsProvidersGetAvailableModelsByType.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, jsonResult, readJson } from "./_helpers.js";

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

- \`sources\` — every connector instance the org has wired up plus the
  synthetic \`knowledgeBase_<orgId>\` entry for the org's KB. Each
  item's \`id\` is exactly the value to put in \`pipeshub_chat\`'s or
  \`pipeshub_search\`'s \`apps\` filter.
- \`llmModels\` — chat / generation models. Each item's \`modelKey\`
  is the value to pass on \`pipeshub_chat\` / \`pipeshub_search\` as
  \`modelKey\`. Pick \`isDefault: true\` unless the user asks for a
  specific model.
- \`embeddingModels\` — vector embedding models (only fetched when
  explicitly requested via \`include\`).

Call this once at the start of a session and cache the result —
sources and models change infrequently. \`sources\` and \`llmModels\`
are returned by default; pass \`include\` to override.`,
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
      const [r] = await knowledgeHubGetKnowledgeHubRootNodes(client, {
        page: 1,
        limit: 200,
      }, { fetchOptions }).$inspect();
      if (!r.ok) return errorResult(`sources: ${r.error.message}`);
      const parsed = await readJson<{ items?: any[] }>(r.value);
      if (!parsed.ok) return parsed.result;
      result["sources"] = (parsed.value.items ?? []).map((n: any) => ({
        id: n.id,
        name: n.name,
        kind: n.connector === "KB" ? "knowledgeBase" : "connector",
        connector: n.connector,
        hasChildren: n.hasChildren,
      }));
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
      const parsed = await readJson<{ models?: any[] }>(r.value);
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
