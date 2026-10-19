// Whether the server mounts `pipeshub_chat` (and `pipeshub_agents`, which only
// picks an `agentId` for chat).
//
// Search and read is the default way to answer; chat is optional. An agent
// that can call tools answers as well without it, for less money and time, so
// an operator may leave it out. The default stays on, so no existing setup
// loses a tool.

export const CHAT_ENV = "PIPESHUB_MCP_CHAT";

// Only the two documented values (any case, trimmed): a near miss such as
// "false" stops the server and names the choices, rather than being read one
// way here and documented another.
const ON = new Set(["", "on"]);
const OFF = new Set(["off"]);

/** Reads `PIPESHUB_MCP_CHAT`: unset or `on` mounts chat, `off` leaves it out. */
export function chatEnabledFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = (env[CHAT_ENV] ?? "").trim();
  const value = raw.toLowerCase();
  if (ON.has(value)) return true;
  if (OFF.has(value)) return false;
  throw new Error(
    `${CHAT_ENV} must be "on" or "off"; "off" leaves pipeshub_chat and `
      + `pipeshub_agents out (got "${raw}").`,
  );
}
