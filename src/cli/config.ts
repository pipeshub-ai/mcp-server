// Environment resolution, URL normalization, and the cleartext transport rule
// for the `pipeshub` CLI.
//
// Nothing here ever prints, logs, or returns the token to a caller that might
// render it. `resolveToken` hands back the raw value for use as a bearer and
// nothing else; `describeToken` is what the CLI is allowed to show a human.

/** Exit codes. 0/3/4/5/6 are contractual — agents branch on them. */
export const EXIT = {
  OK: 0,
  ERROR: 1,
  USAGE: 2,
  UNAUTHENTICATED: 3,
  FORBIDDEN: 4,
  RATE_LIMITED: 5,
  /** No results — an empty hit list, or an `ask` answer with no citations. */
  NO_RESULTS: 6,
} as const;

export class CliError extends Error {
  readonly code: number;
  constructor(message: string, code: number = EXIT.ERROR) {
    super(message);
    this.code = code;
  }
}

/**
 * The token, in priority order:
 *   PIPESHUB_TOKEN      — what QM's keychain produces for service "pipeshub"
 *                         (defaultEnvKey → `${SERVICE.toUpperCase()}_TOKEN`)
 *   PIPESHUB_MCP_TOKEN  — what our own PAT create panel's paste block emits
 *
 * Accepting both is deliberate: the two names come from different places in
 * our own product and a person who followed either instruction must not end
 * up with a CLI that reports "not connected" while holding a valid token.
 */
export function resolveToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env["PIPESHUB_TOKEN"] ?? env["PIPESHUB_MCP_TOKEN"] ?? "";
  const token = raw.trim();
  return token === "" ? null : token;
}

/** Which variable supplied the token — for diagnostics, never the value. */
export function tokenSource(env: NodeJS.ProcessEnv = process.env): string | null {
  if ((env["PIPESHUB_TOKEN"] ?? "").trim() !== "") return "PIPESHUB_TOKEN";
  if ((env["PIPESHUB_MCP_TOKEN"] ?? "").trim() !== "") return "PIPESHUB_MCP_TOKEN";
  return null;
}

/**
 * The base URL, in priority order:
 *   PIPESHUB_BASE_URL — an ORIGIN with no path (keychain or org credential;
 *                       `sandbox.env` does not currently reach the sandbox)
 *   PIPESHUB_MCP_URL  — already INCLUDES `/mcp`, because it is meant for a
 *                       local MCP client
 *
 * Both are normalized to a bare origin. Without that step the two variables
 * produce `…/mcp/mcp` or a request to the wrong path, depending on which one
 * happened to be set.
 */
export function originSource(env: NodeJS.ProcessEnv = process.env): string {
  return (env["PIPESHUB_BASE_URL"] ?? "").trim() !== ""
    ? "PIPESHUB_BASE_URL"
    : "PIPESHUB_MCP_URL";
}

export function resolveOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env["PIPESHUB_BASE_URL"] ?? env["PIPESHUB_MCP_URL"] ?? "").trim();
  if (raw === "") return null;
  // Name the variable that actually supplied the value. Reporting
  // PIPESHUB_BASE_URL unconditionally sends anyone using PIPESHUB_MCP_URL to
  // edit a variable that is not set.
  const name = originSource(env);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new CliError(`${name} is not a valid URL: ${raw}`, EXIT.USAGE);
  }
  // Only http/https have a usable origin here. For any other scheme `URL`
  // either yields the literal string "null" (foo://host, mailto:) or an origin
  // we cannot speak to (ftp://h). Rejecting here keeps the failure a USAGE
  // error with a readable message — left to `assertTransport`, the "null"
  // string reaches `new URL("null")`, throws a bare TypeError, and surfaces as
  // "Invalid URL" with exit 1.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CliError(
      `${name} must be an http:// or https:// URL (got "${parsed.protocol}//"). `
        + "Set it to your PipesHub origin, e.g. https://pipeshub.example.com",
      EXIT.USAGE,
    );
  }
  // Strip path, query, and fragment — keep scheme, host, and port only.
  return parsed.origin;
}

/** The MCP endpoint is always `{origin}/mcp`. Stated once, used everywhere. */
export function mcpEndpoint(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/mcp`;
}

const CLEARTEXT_SUFFIXES = [
  ".local",
  ".internal",
  ".svc",
  ".svc.cluster.local",
];

function isLoopback(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "[::1]") return true;
  return /^127\./.test(host);
}

function isPrivateLiteral(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  // IPv4 private + link-local
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true;
  return false;
}

/**
 * Whether cleartext HTTP is acceptable for `host`.
 *
 * The rule is concrete on purpose — "is this a compose service name?" must not
 * be a judgement call in code. Allowed: loopback, RFC1918 / link-local
 * literals, single-label hostnames (compose and Kubernetes short names), and a
 * fixed suffix list. Anything else containing a dot is treated as public DNS.
 *
 * So `http://pipeshub-ai` passes and `http://evil.example` does not.
 */
export function cleartextAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (isLoopback(h)) return true;
  if (isPrivateLiteral(h)) return true;
  if (h === "host.docker.internal") return true;
  if (!h.includes(".")) return true; // single-label: compose / k8s short name
  return CLEARTEXT_SUFFIXES.some((s) => h.endsWith(s));
}

/**
 * Refuse cleartext to public hosts unless explicitly overridden.
 *
 * Worth knowing where this actually bites: QM agent sandboxes do not run on
 * the operator's machine, so from a sandbox PipesHub is reached over public
 * DNS and this rule effectively mandates HTTPS. The allowlist matters for the
 * other cases — a laptop against localhost, CI, or a co-located container.
 */
export function assertTransport(origin: string, insecureHttp: boolean): void {
  const url = new URL(origin);
  if (url.protocol === "https:") return;
  if (url.protocol !== "http:") {
    throw new CliError(
      `unsupported URL scheme "${url.protocol}" in ${origin}`,
      EXIT.USAGE,
    );
  }
  if (insecureHttp) return;
  if (cleartextAllowed(url.hostname)) return;
  throw new CliError(
    `refusing to send credentials in cleartext to a public host: ${origin}\n`
      + "Use https://, or pass --insecure-http if this really is a private "
      + "address that the built-in rules do not cover.",
    EXIT.USAGE,
  );
}

/** Non-secret description of the configured credential, safe to print. */
export function describeToken(token: string): {
  userId: string | null;
  orgId: string | null;
  fullName: string | null;
  scopes: string[];
  expiresAt: string | null;
  expired: boolean | null;
} {
  const empty = {
    userId: null,
    orgId: null,
    fullName: null,
    scopes: [] as string[],
    expiresAt: null,
    expired: null,
  };
  const parts = token.split(".");
  const claimsPart = parts[1];
  if (parts.length !== 3 || claimsPart === undefined) return empty;
  let claims: Record<string, unknown>;
  try {
    const padded = claimsPart + "=".repeat((4 - (claimsPart.length % 4)) % 4);
    const json = Buffer.from(
      padded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    claims = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return empty;
  }
  const str = (k: string): string | null =>
    typeof claims[k] === "string" ? (claims[k] as string) : null;
  const scopeRaw = claims["scope"];
  const scopes = typeof scopeRaw === "string"
    ? scopeRaw.split(/\s+/).filter(Boolean)
    : Array.isArray(claims["scopes"])
    ? (claims["scopes"] as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const exp = typeof claims["exp"] === "number" ? (claims["exp"] as number) : null;
  return {
    userId: str("userId"),
    orgId: str("orgId"),
    fullName: str("fullName"),
    scopes,
    expiresAt: exp === null ? null : new Date(exp * 1000).toISOString(),
    expired: exp === null ? null : exp * 1000 < Date.now(),
  };
}
