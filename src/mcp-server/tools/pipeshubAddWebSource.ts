// pipeshub_add_web_source — the Web connector, set up the way the connector
// settings page does it: create it, save what to crawl, turn syncing on.

import * as z from "zod";
import {
  connectorCreate,
  connectorSaveSyncConfig,
  connectorToggleSync,
} from "../../funcs/knowledgeBaseWrite.js";
import { ToolDefinition } from "../tools.js";
import { errorResult, httpErrorResult, jsonResult, readJson } from "./_helpers.js";
import { webOrigin } from "./_writeHelpers.js";

/** The Web connector's own default and ceiling (`MAX_PAGES_LIMIT`). */
const DEFAULT_PAGES = 100;
const MAX_PAGES = 10_000;
/** Daily, the Web connector's registered schedule. */
const RECRAWL_MINUTES = 1440;

const args = {
  url: z.string().url().refine((u) => /^https?:$/.test(new URL(u).protocol), "an http(s) URL")
    .describe("Start page; links from it are followed."),
  maxPages: z.number().int().min(1).max(MAX_PAGES).optional()
    .describe(`Most pages to keep (default ${DEFAULT_PAGES}).`),
  name: z.string().trim().min(1).max(255).optional()
    .describe("Source name (default: the host)."),
};

export const tool$pipeshubAddWebSource: ToolDefinition<typeof args> = {
  name: "pipeshub_add_web_source",
  description:
    `Index a website: crawls from \`url\` now and daily, as the user's own Web
connector. Check progress with \`pipeshub_indexing_status\` (\`collectionId\`
= the returned \`connectorId\`). Calling again adds a second source.`,
  scopes: ["write", "connect"],
  annotations: {
    title: "Add a website to PipesHub",
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    readOnlyHint: false,
  },
  args,
  tool: async (client, args, ctx) => {
    const options = { fetchOptions: { signal: ctx.signal } };
    const name = args.name ?? new URL(args.url).hostname;
    const created = await connectorCreate(
      client,
      { connectorType: "Web", instanceName: name, scope: "personal", authType: "NONE" },
      options,
    );
    if (!created.ok) return errorResult(`Add web source: ${created.error.message}`);
    const createErr = await httpErrorResult(created.value, "Add web source");
    if (createErr) return createErr;
    const body = await readJson<{ connector?: { connectorId?: string }; connectorId?: string; _key?: string }>(
      created.value,
      "Add web source",
    );
    if (!body.ok) return body.result;
    const connectorId = body.value.connector?.connectorId ?? body.value.connectorId ?? body.value._key;
    if (!connectorId) return errorResult("Add web source: the response carried no connector id.");
    const url = `${webOrigin(client)}/workspace/connectors/personal/?connectorType=Web`;
    // Past this point the connector exists: a failure names it, so the person can
    // finish it in the settings page instead of the agent adding a second one.
    const unfinished = (step: string, detail: string) =>
      errorResult(`Add web source: created "${name}" (connectorId ${connectorId}) but could not ${step}: ${detail} Finish it at ${url}`);

    const crawl = { url: args.url, type: "recursive", max_pages: args.maxPages ?? DEFAULT_PAGES };
    const saved = await connectorSaveSyncConfig(client, connectorId, {
      sync: {
        selectedStrategy: "SCHEDULED",
        scheduledConfig: { intervalMinutes: RECRAWL_MINUTES },
        customValues: crawl,
        ...crawl,
      },
      filters: { sync: { values: {} }, indexing: { values: {} } },
    }, options);
    if (!saved.ok) return unfinished("save what to crawl", saved.error.message);
    const saveErr = await httpErrorResult(saved.value, "save what to crawl");
    if (saveErr) return unfinished("save what to crawl", textOf(saveErr));

    const started = await connectorToggleSync(client, connectorId, options);
    if (!started.ok) return unfinished("start the crawl", started.error.message);
    const startErr = await httpErrorResult(started.value, "start the crawl");
    if (startErr) return unfinished("start the crawl", textOf(startErr));

    return jsonResult({ connectorId, name, startUrl: args.url, maxPages: crawl.max_pages, url });
  },
};

function textOf(r: { content: Array<{ type: string; text?: string }> }): string {
  return r.content.map((c) => c.text ?? "").join(" ");
}
