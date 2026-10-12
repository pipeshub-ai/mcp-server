import * as z from "zod";
import { aiModelsProvidersGetAvailableModelsByType } from "../../funcs/aiModelsProvidersGetAvailableModelsByType.js";
import { ToolDefinition } from "../tools.js";
import {
  errorResult,
  jsonResult,
  listAllSources,
  listSourceCoverage,
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

/** What an agent must know when a source is only partly indexed. */
export const PARTIAL_COVERAGE_NOTE =
  "Search and chat find only indexed records. Records counted under "
  + "`notIndexed` exist, but their content is not indexed yet, so a search "
  + "that finds nothing does not mean the thing does not exist. Look it up by "
  + "link or key with `pipeshub_get_record_content` `mode:\"lookup\"`, "
  + "and tell the user which content could not be searched.";

export const tool$pipeshubSources: ToolDefinition<typeof args> = {
  name: "pipeshub_sources",
  description:
    `Discover available chat sources and AI models in one call.

Returns up to three sections:

- \`sources\` — connectors (\`kind: "connector"\`) and collections
  (\`kind: "knowledgeBase"\`). For \`pipeshub_search\` and
  \`pipeshub_chat\`, put a connector \`id\` in \`apps\` and a collection
  \`id\` in \`kb\`. \`sourcesTruncated: true\` means the list stopped at
  1,000 sources. Each has \`coverage\` \`{ indexed, total, notIndexed }\`;
  search sees only \`indexed\`.
- \`llmModels\` — chat / generation models. Each item's \`modelKey\`
  is the value to pass on \`pipeshub_chat\` as \`modelKey\`. Pick
  \`isDefault: true\` unless the user asks for a specific model.
- \`embeddingModels\` — vector embedding models (only fetched when
  explicitly requested via \`include\`).

The model lists need the \`config:read\` scope. A token without it still
gets \`sources\`; the model sections are left out and \`notes\` says why.
Omit \`modelKey\` on \`pipeshub_chat\` to use the org's default model.

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
    const notes: string[] = [];

    if (want("sources")) {
      const listed = await listAllSources(client, { signal: ctx.signal });
      if (!listed.ok) return listed.result;
      const { coverage, notes: coverageNotes } = await listSourceCoverage(
        client,
        listed.sources,
        { signal: ctx.signal },
      );
      result["sources"] = listed.sources.map((s) => {
        const c = coverage.get(s.id);
        return c ? { ...s, coverage: c } : s;
      });
      if (listed.truncated) result["sourcesTruncated"] = true;
      // Said in the response, and only when it applies, rather than in the
      // description every session pays for.
      const partial = [...coverage.values()].some((c) =>
        Object.keys(c.notIndexed).length > 0
      );
      if (partial) result["coverageNote"] = PARTIAL_COVERAGE_NOTE;
      notes.push(...coverageNotes);
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
      // The model listing requires config:read, which agent tokens usually
      // lack. Failing the whole call on that 403 would also discard the
      // sources the token can see, and an agent then searches everything.
      if (r.value.status === 403) {
        await r.value.body?.cancel();
        notes.push(`${key} omitted: this token lacks the config:read scope.`);
        continue;
      }
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

    if (notes.length > 0) result["notes"] = notes;
    return jsonResult(result);
  },
};
