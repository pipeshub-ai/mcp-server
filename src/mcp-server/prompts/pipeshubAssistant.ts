import * as z from "zod";
import { PromptDefinition } from "../prompts.js";
import { PIPESHUB_INSTRUCTIONS } from "../instructions.js";

const args = {
  query: z.string().optional().describe(
    "Optional. The user's request to route. Provide it to have the guidance "
      + "applied to a concrete request; omit it to just load the routing "
      + "guidance as a seed system prompt at the start of a session.",
  ),
};

export const prompt$pipeshubAssistant: PromptDefinition<typeof args> = {
  name: "pipeshub-assistant",
  description:
    "Load PipesHub tool-routing guidance so the assistant picks the correct "
    + "tool (pipeshub_chat / search / agents / directory) and lists agents "
    + "with pipeshub_agents when unsure which route fits the query.",
  scopes: ["read"],
  args,
  prompt: (_client, args, _extra) => {
    const text = args.query
      ? `${PIPESHUB_INSTRUCTIONS}\n\n---\n\nFollow the routing rules above to `
        + `handle this request, picking the right tool (and listing agents via `
        + `\`pipeshub_agents\` if unsure which route fits):\n\n${args.query}`
      : PIPESHUB_INSTRUCTIONS;

    return {
      messages: [
        {
          role: "user",
          content: { type: "text", text },
        },
      ],
    };
  },
};
