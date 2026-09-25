// Parsers shared by `start` and `serve`. Stricli prints a thrown error as
// `Failed to parse "<value>" for <flag>: <message>`, so each message is
// written to be read in that position by the person who typed the flag.

const API_BASE_PATH = "/api/v1";

/**
 * Parse `--server-url`. README, server.json and the customer skill document it
 * as the instance origin, but every API path the SDK builds is relative to
 * /api/v1, and PipesHub answers any other path with the web app's HTML shell.
 * So a bare origin gets the API base path; a URL that already has a path is
 * taken as given.
 */
export function parseServerURLFlag(value: string): string {
  let url: URL | null = null;
  try {
    url = new URL(value);
  } catch {
    // reported below
  }
  if (url === null || (url.protocol !== "https:" && url.protocol !== "http:")) {
    throw new Error(
      `"${value}" is not a web address. Pass your PipesHub address including `
        + "https://, for example --server-url https://pipeshub.example.com",
    );
  }
  if (url.pathname === "/") url.pathname = API_BASE_PATH;
  return url.toString();
}

export function parsePortFlag(value: string): number {
  const port = Number(value);
  if (value.trim() === "" || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(
      `--port must be a whole number from 0 to 65535 (got "${value}"). `
        + "Use 0 to let the system pick a free port.",
    );
  }
  return port;
}

export function parseEnvFlag(value: string): [string, string] {
  const sepIdx = value.indexOf("=");
  const key = sepIdx === -1 ? "" : value.slice(0, sepIdx);
  const val = sepIdx === -1 ? "" : value.slice(sepIdx + 1);
  if (key === "" || val === "") {
    throw new Error(
      `--env must look like NAME=value, with both parts filled in (got "${value}").`,
    );
  }
  return [key, val];
}
