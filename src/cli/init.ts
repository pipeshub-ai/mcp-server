// `pipeshub init`: a trial workspace for an agent with no account. The server
// hands back a token once; it goes straight into the 0600 credentials file
// that `pipeshub login` uses, and is never printed.

import { describeFetchFailure } from "../lib/fetch-failure.js";
import { CliError, EXIT, assertTransport } from "./config.js";
import { credentialsPath, readStoredLogin, writeSecretFile, type StoredLogin } from "./login.js";

const REQUEST_TIMEOUT_MS = 60_000;

export interface Sandbox {
  workspaceId: string;
  origin: string;
  mcpUrl: string;
  expiresAt: string;
  limits: { documents: number; uploadBytes: number; aiBudgetUsd: number };
  credentials: string;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

/** Why the stored sign-in must not be replaced without --force, or null. */
async function keepReason(env: NodeJS.ProcessEnv): Promise<string | null> {
  const current = await readStoredLogin(env);
  if (current === null) return null;
  if (current.sandbox) {
    return current.expiresAt > Date.now()
      ? `You already have a trial workspace on ${current.origin} until ${new Date(current.expiresAt).toISOString()}; use it, or run 'pipeshub init --force' to replace it.`
      : null;
  }
  return `${credentialsPath(env)} holds your sign-in to ${current.origin}, which 'pipeshub init' would replace. Use that sign-in, or run 'pipeshub init --force' to replace it with a trial workspace.`;
}

export async function createSandbox(
  origin: string,
  opts: { client?: string | undefined; force: boolean; insecureHttp: boolean },
  env: NodeJS.ProcessEnv = process.env,
): Promise<Sandbox> {
  assertTransport(origin, opts.insecureHttp);
  const keep = opts.force ? null : await keepReason(env);
  if (keep !== null) throw new CliError(keep, EXIT.USAGE);

  let res: Response;
  try {
    res = await fetch(`${origin}/api/v1/sandboxes`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(opts.client ? { client: opts.client } : {}),
      // The reply carries a token; a redirect could hand it to another host.
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e: unknown) {
    throw new CliError(`could not reach ${origin}: ${describeFetchFailure(e)}`);
  }

  if (res.status === 404) {
    throw new CliError(
      `${origin} does not offer trial workspaces. Run 'pipeshub login --url ${origin}' to sign in instead.`,
      EXIT.USAGE,
    );
  }
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after"));
    throw new CliError(
      `too many trial workspaces from this network${wait > 0 ? `; try again in ${Math.ceil(wait / 60)} min` : ""}, `
        + "or run 'pipeshub login' to sign in to an account.",
      EXIT.RATE_LIMITED,
    );
  }
  if (res.status === 503) {
    throw new CliError(
      "trial workspaces are paused right now. Try again later, or run 'pipeshub login' to sign in to an account.",
    );
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const token = str(body["token"]);
  const workspaceId = str(body["workspaceId"]);
  const expiresAt = Date.parse(str(body["expiresAt"]) ?? "");
  if (res.status !== 201 || !token || !workspaceId || !Number.isFinite(expiresAt)) {
    throw new CliError(`the trial workspace could not be created (HTTP ${res.status}).`);
  }

  const stored: StoredLogin = { origin, accessToken: token, expiresAt, sandbox: { workspaceId } };
  await writeSecretFile(credentialsPath(env), stored);
  const limits = (body["limits"] ?? {}) as Sandbox["limits"];
  return {
    workspaceId,
    origin,
    mcpUrl: `${origin}/mcp`,
    expiresAt: new Date(expiresAt).toISOString(),
    limits,
    credentials: credentialsPath(env),
  };
}
