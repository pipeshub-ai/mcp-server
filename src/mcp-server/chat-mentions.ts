// Some tool descriptions name `pipeshub_chat` where it helps the agent. A
// server that leaves chat out (`PIPESHUB_MCP_CHAT=off`) must not point the
// agent at a tool it cannot see, so it mounts those tools with each mention
// cut. A cut that no longer matches its description throws when the server is
// built, so an edit to a description cannot quietly bring a mention back.

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
};

/** The tool as a server without chat mounts it: no mention of `pipeshub_chat`. */
export function withoutChatMentions<T extends { name: string; description: string }>(
  def: T,
): T {
  const cuts = CUTS[def.name];
  if (!cuts) return def;
  let description = def.description;
  for (const [from, to] of cuts) {
    if (!description.includes(from)) {
      throw new Error(
        `${def.name}: its description no longer contains the chat mention to cut: `
          + JSON.stringify(from.slice(0, 60)),
      );
    }
    description = description.replace(from, to);
  }
  return { ...def, description };
}
