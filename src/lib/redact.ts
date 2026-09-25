/**
 * `text` with every occurrence of `token` replaced by "[redacted]".
 *
 * Server text is printed by the CLI and handed to the model by the MCP server,
 * so a proxy or error page that echoes the request's Authorization header
 * would leak the token. A value too short to be a real token is left alone
 * rather than blanking every occurrence of, say, "1".
 */
export function withoutToken(text: string, token: string): string {
  return token.length < 8 ? text : text.split(token).join("[redacted]");
}
