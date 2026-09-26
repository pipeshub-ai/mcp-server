/**
 * Why a fetch never got a response, in words a person can act on.
 *
 * Node's fetch, which the published binaries run on, reports every network
 * failure as a bare "fetch failed" and keeps the reason (connection refused,
 * no such host, an untrusted certificate) on `cause`. Printing only the
 * message dropped the one detail that says what to fix. Shared by the
 * `pipeshub` CLI and the MCP server's SDK.
 */
export function describeFetchFailure(e: unknown): string {
  const err = e as Error & { cause?: unknown };
  const cause = causeText(err.cause);
  return cause && !err.message.includes(cause)
    ? `${err.message} (${cause})`
    : err.message;
}

/**
 * A fetch cause as text. When Node tries more than one address (`localhost`,
 * any dual-stack host) and all fail, the cause is an AggregateError whose own
 * message is empty: the reasons are on `errors`, the summary on `code`.
 */
export function causeText(cause: unknown): string {
  if (!(cause instanceof Error)) return "";
  if (cause.message) return cause.message;
  const inner = cause instanceof AggregateError
    ? [...new Set(
      cause.errors
        .filter((x): x is Error => x instanceof Error && x.message !== "")
        .map((x) => x.message),
    )]
    : [];
  if (inner.length > 0) {
    const shown = inner.slice(0, 3).join("; ");
    return inner.length > 3 ? `${shown}; and ${inner.length - 3} more` : shown;
  }
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}
