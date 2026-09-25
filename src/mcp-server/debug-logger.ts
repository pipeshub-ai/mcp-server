import { format } from "node:util";
import type { Logger } from "../lib/logger.js";

/**
 * The SDK's debug logger for --log-level debug. It must not be `console`:
 * console.log and console.group write to stdout, which for the stdio server is
 * the MCP connection itself, so every debug line corrupted the protocol.
 */
export function stderrDebugLogger(): Logger {
  let indent = "";
  const write = (text: string) => {
    process.stderr.write(text.replace(/^/gm, indent) + "\n");
  };
  return {
    log: (...args: unknown[]) => write(format(...args)),
    group: (label?: string) => {
      if (label !== undefined) write(label);
      indent += "  ";
    },
    groupEnd: () => {
      indent = indent.slice(2);
    },
  };
}
