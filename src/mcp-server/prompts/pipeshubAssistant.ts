import * as z from "zod";
import { PromptDefinition } from "../prompts.js";
import { pipeshubInstructions, SHOW_CITATIONS_STEP } from "../instructions.js";

const args = {
  query: z.string().optional().describe(
    "Optional. The user's request to route. Provide it to have the guidance "
      + "applied to a concrete request; omit it to just load the routing "
      + "guidance as a seed system prompt at the start of a session.",
  ),
};

/**
 * The prompt for a server with or without chat. Its body is that server's
 * instructions, and without chat it does not mention the agents tool, which
 * is not mounted then.
 */
export function createPipeshubAssistantPrompt(
  { chat, showsApps = () => true }: {
    chat: boolean;
    /** Whether the client shows MCP Apps views; without them, no citations step. */
    showsApps?: () => boolean;
  },
): PromptDefinition<typeof args> {
  const all = pipeshubInstructions({ chat });
  const agentsHint = chat
    ? " (and listing agents via `pipeshub_agents` if unsure which route fits)"
    : "";
  return {
    name: "pipeshub-assistant",
    description: chat
      ? "Load PipesHub tool-routing guidance so the assistant picks the correct "
        + "tool (search and read by default; chat / agents / directory) and lists agents "
        + "with pipeshub_agents when unsure which route fits the query."
      : "Load PipesHub tool-routing guidance so the assistant picks the correct "
        + "tool (search and read by default; directory for people).",
    scopes: ["read"],
    args,
    prompt: (_client, args, _extra) => {
      const instructions = showsApps() ? all : all.replace(SHOW_CITATIONS_STEP, "");
      const text = args.query
        ? `${instructions}\n\n---\n\nFollow the routing rules above to `
          + `handle this request, picking the right tool${agentsHint}:\n\n`
          + args.query
        : instructions;

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
}

export const prompt$pipeshubAssistant = createPipeshubAssistantPrompt({
  chat: true,
});
