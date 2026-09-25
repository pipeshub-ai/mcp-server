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
