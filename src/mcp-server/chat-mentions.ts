// Some tool descriptions and argument texts name `pipeshub_chat` or its
// citations where it helps the agent. A server that leaves chat out
// (`PIPESHUB_MCP_CHAT=off`) must not point the agent at a tool it cannot see,
// so it mounts those tools with each mention cut. A cut that no longer matches
// its text throws when the server is built, so an edit cannot quietly bring a
// mention back.

import type { ZodType } from "zod";

type Cut = readonly [from: string, to: string];

const CUTS: Readonly<Record<string, readonly Cut[]>> = {
  pipeshub_search: [
    [
      "`pipeshub_chat`, where offered, is optional: it runs PipesHub's assistant\n"
        + "and returns an answer with citations to check.\n",
      "",
    ],
  ],
  pipeshub_sources: [
    [
      "Discover available chat sources and AI models",
      "Discover available sources and AI models",
    ],
    [
      "For `pipeshub_search` and\n  `pipeshub_chat`, put a connector",
      "For `pipeshub_search`,\n  put a connector",
    ],
    [
      "Each item's `modelKey`\n  is the value to pass on `pipeshub_chat` as `modelKey`. Pick\n"
        + "  `isDefault: true` unless the user asks for a specific model.",
      "`isDefault: true` marks\n  the org's default.",
    ],
    ["\nOmit `modelKey` on `pipeshub_chat` to use the org's default model.", ""],
  ],
  pipeshub_get_record_content: [
    [
      " `pipeshub_chat` cannot do\nthese — it never sees a whole document.",
      "",
    ],
    ["a `pipeshub_search` top hit, a\nchat citation, or", "a `pipeshub_search` top hit or"],
  ],
  pipeshub_download_record: [
    ["Get `recordId` from a chat citation or a `pipeshub_search` hit.", "Get `recordId` from a `pipeshub_search` hit."],
  ],
};

const RECORD_ID_FROM_CHAT: Cut = [
  "Get it from a chat citation (`citations[*].recordId`) or from a `pipeshub_search` hit.",
  "Get it from a `pipeshub_search` hit.",
];

// Argument texts, by tool and argument name.
const ARG_CUTS: Readonly<Record<string, Readonly<Record<string, readonly Cut[]>>>> = {
  pipeshub_download_record: { recordId: [RECORD_ID_FROM_CHAT] },
  pipeshub_get_record_content: { recordId: [RECORD_ID_FROM_CHAT] },
};

function applyCuts(where: string, text: string, cuts: readonly Cut[]): string {
  let out = text;
  for (const [from, to] of cuts) {
    if (!out.includes(from)) {
      throw new Error(
        `${where} no longer contains the chat mention to cut: `
          + JSON.stringify(from.slice(0, 60)),
      );
    }
    out = out.replace(from, to);
  }
  return out;
}

/** The tool as a server without chat mounts it: no mention of `pipeshub_chat`. */
export function withoutChatMentions<
  T extends { name: string; description: string; args?: unknown },
>(def: T): T {
  const cuts = CUTS[def.name];
  const argCuts = ARG_CUTS[def.name];
  if (!cuts && !argCuts) return def;
  const description = cuts
    ? applyCuts(`${def.name}: its description`, def.description, cuts)
    : def.description;
  let args = def.args;
  if (argCuts) {
    const shape = { ...(def.args as Record<string, ZodType>) };
    for (const [name, list] of Object.entries(argCuts)) {
      const schema = shape[name];
      if (!schema?.description) {
        throw new Error(`${def.name}.${name}: no argument text to cut a chat mention from`);
      }
      shape[name] = schema.describe(applyCuts(`${def.name}: its ${name} argument`, schema.description, list));
    }
    args = shape;
  }
  return { ...def, description, args };
}
