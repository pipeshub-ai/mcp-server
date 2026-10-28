// `pipeshub login`: device-code sign-in (RFC 8628) against the instance's own
// first-party client, advertised on discovery as `pipeshub_device_client_id`.
// Nobody copies a token: the person approves a code in the browser and the
// CLI receives it directly.
//
// The tokens land in a file only this user can read. They are never printed,
// and never sent to any origin but the one that issued them. Environment
// variables still win, so a QM sandbox (PIPESHUB_TOKEN from its keychain)
// behaves exactly as before.

import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { describeFetchFailure } from "../lib/fetch-failure.js";
import { CliError, EXIT, assertTransport } from "./config.js";

export const CLOUD_ORIGIN = "https://app.pipeshub.com";
const REQUEST_TIMEOUT_MS = 30_000;
/** Refresh this long before expiry, so a token does not lapse mid-command. */
const REFRESH_MARGIN_MS = 60_000;

interface Endpoints {
  origin: string;
  clientId: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
}

export interface StoredLogin extends Partial<Endpoints> {
  origin: string;
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
  /** Set by `pipeshub init`: a trial workspace's token, which is never refreshed. */
  sandbox?: { workspaceId: string };
}

export interface PendingLogin extends Endpoints {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  intervalSeconds: number;
  /** Epoch ms. */
  expiresAt: number;
}

function configDir(env: NodeJS.ProcessEnv): string {
  const base = (env["XDG_CONFIG_HOME"] ?? "").trim() || join(env["HOME"] || homedir(), ".config");
  return join(base, "pipeshub");
}

export const credentialsPath = (env: NodeJS.ProcessEnv = process.env) => join(configDir(env), "credentials.json");
const pendingPath = (env: NodeJS.ProcessEnv) => join(configDir(env), "pending-login.json");

/** The file's JSON when it has the fields we use; a hand-edited or truncated file reads as absent. */
async function readJsonFile<T>(path: string, required: Record<string, "string" | "number">): Promise<T | null> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (typeof value !== "object" || value === null) return null;
    const fields = value as Record<string, unknown>;
    const ok = Object.entries(required).every(([k, type]) =>
      type === "number" ? Number.isFinite(fields[k]) : typeof fields[k] === "string" && fields[k] !== ""
    );
    return ok ? (value as T) : null;
  } catch {
    return null;
  }
}

const ENDPOINT_FIELDS = { origin: "string", clientId: "string", tokenEndpoint: "string" } as const;
const readStored = (path: string) =>
  readJsonFile<StoredLogin>(path, { origin: "string", accessToken: "string", expiresAt: "number" });

/** The stored sign-in as it is on disk, without refreshing it. */
export const readStoredLogin = (env: NodeJS.ProcessEnv = process.env) => readStored(credentialsPath(env));

/** Write via rename so a reader never sees half a file, with 0600 from the first byte. */
export async function writeSecretFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, path);
}

type OAuthReply = { status: number; body: Record<string, unknown> };

/** Every request that carries a device code or token: the transport rule is checked here, before sending. */
async function postForm(url: string, form: Record<string, string>, insecureHttp: boolean): Promise<OAuthReply> {
  assertTransport(new URL(url).origin, insecureHttp);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(form),
      // A redirect would replay the device code or refresh token in the body to its target.
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e: unknown) {
    throw new CliError(`could not reach ${url}: ${describeFetchFailure(e)}`);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

/** The instance's device endpoints and first-party client, from OIDC discovery. */
export async function discover(origin: string, insecureHttp: boolean): Promise<Endpoints & { deviceEndpoint: string }> {
  assertTransport(origin, insecureHttp);
  const url = `${origin}/.well-known/openid-configuration`;
  let meta: Record<string, unknown>;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    meta = res.ok ? ((await res.json()) as Record<string, unknown>) : {};
  } catch (e: unknown) {
    throw new CliError(`could not reach ${url}: ${describeFetchFailure(e)}`);
  }
  const deviceEndpoint = str(meta["device_authorization_endpoint"]);
  const tokenEndpoint = str(meta["token_endpoint"]);
  const clientId = str(meta["pipeshub_device_client_id"]);
  if (!deviceEndpoint || !tokenEndpoint || !clientId) {
    throw new CliError(
      `${origin} does not offer sign-in from the CLI (its discovery document has no device `
        + "login). Set PIPESHUB_TOKEN to a personal access token instead: in PipesHub, "
        + "Developer Settings → Personal Access Tokens.",
      EXIT.USAGE,
    );
  }
  const revocationEndpoint = str(meta["revocation_endpoint"]);
  // These receive the device and refresh tokens: they must be on the instance we were pointed at.
  for (const endpoint of [deviceEndpoint, tokenEndpoint, revocationEndpoint]) {
    const at = endpoint ? new URL(endpoint).origin : origin;
    if (at !== origin) {
      throw new CliError(
        `${origin} sends sign-in to another address (${at}), and tokens go only to the origin you named. `
          + `If ${at} is the same PipesHub, run 'pipeshub login --url ${at}'.`,
      );
    }
  }
  return { origin, clientId, tokenEndpoint, deviceEndpoint, ...(revocationEndpoint ? { revocationEndpoint } : {}) };
}

/** Ask for a user code and remember the device code, so `--wait` can pick it up later. */
export async function startLogin(
  origin: string,
  insecureHttp: boolean,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PendingLogin> {
  const { deviceEndpoint, ...endpoints } = await discover(origin, insecureHttp);
  // No `scope`: the server grants the first-party app's preset.
  const r = await postForm(deviceEndpoint, { client_id: endpoints.clientId }, insecureHttp);
  const deviceCode = str(r.body["device_code"]);
  const userCode = str(r.body["user_code"]);
  const verificationUri = str(r.body["verification_uri"]);
  if (r.status !== 200 || !deviceCode || !userCode || !verificationUri) {
    throw new CliError(`sign-in could not start: ${oauthError(r)}`);
  }
  const verificationUriComplete = str(r.body["verification_uri_complete"]) ?? verificationUri;
  // The person opens these links and signs in there, so they meet the transport rule too.
  for (const link of [verificationUri, verificationUriComplete]) assertTransport(new URL(link).origin, insecureHttp);
  const pending: PendingLogin = {
    ...endpoints,
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete,
    intervalSeconds: Number(r.body["interval"]) || 5,
    expiresAt: Date.now() + (Number(r.body["expires_in"]) || 600) * 1000,
  };
  await writeSecretFile(pendingPath(env), pending);
  return pending;
}

export function readPending(env: NodeJS.ProcessEnv = process.env): Promise<PendingLogin | null> {
  return readJsonFile<PendingLogin>(pendingPath(env), {
    ...ENDPOINT_FIELDS,
    deviceCode: "string",
    userCode: "string",
    verificationUri: "string",
    verificationUriComplete: "string",
    intervalSeconds: "number",
    expiresAt: "number",
  });
}

function oauthError(r: OAuthReply): string {
  return str(r.body["error_description"]) ?? str(r.body["error"]) ?? `HTTP ${r.status}`;
}

function toStored(endpoints: Endpoints, body: Record<string, unknown>, previousRefresh?: string): StoredLogin {
  const accessToken = str(body["access_token"]);
  if (!accessToken) throw new CliError("the sign-in response had no access token");
  const refreshToken = str(body["refresh_token"]) ?? previousRefresh;
  return {
    origin: endpoints.origin,
    clientId: endpoints.clientId,
    tokenEndpoint: endpoints.tokenEndpoint,
    ...(endpoints.revocationEndpoint ? { revocationEndpoint: endpoints.revocationEndpoint } : {}),
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    expiresAt: Date.now() + (Number(body["expires_in"]) || 3600) * 1000,
  };
}

/** Poll until the person approves, denies, or the code expires. */
export async function waitForLogin(
  pending: PendingLogin,
  insecureHttp: boolean,
  env: NodeJS.ProcessEnv = process.env,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<StoredLogin> {
  let interval = pending.intervalSeconds;
  while (Date.now() < pending.expiresAt) {
    await sleep(interval * 1000);
    const r = await postForm(pending.tokenEndpoint, {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: pending.deviceCode,
      client_id: pending.clientId,
    }, insecureHttp);
    if (r.status === 200) {
      const stored = toStored(pending, r.body);
      // shortcut: re-read then rename leaves a moment for a concurrent logout; a file lock would close it.
      if ((await readPending(env))?.deviceCode !== pending.deviceCode) {
        // `logout`, or a newer `login`, dropped this sign-in while it waited: do not undo that.
        await revokeAll(stored, insecureHttp);
        throw new CliError(
          "this sign-in was cancelled while it waited (pipeshub logout, or a newer pipeshub login). "
            + "Run 'pipeshub login' again.",
          EXIT.UNAUTHENTICATED,
        );
      }
      await writeSecretFile(credentialsPath(env), stored);
      await rm(pendingPath(env), { force: true });
      return stored;
    }
    const error = str(r.body["error"]);
    if (error === "authorization_pending") continue;
    // A server error or rate limit does not end the device code; back off and keep polling until it expires.
    if (error === "slow_down" || r.status >= 500 || r.status === 429) {
      interval += 5;
      continue;
    }
    await rm(pendingPath(env), { force: true });
    if (error === "access_denied") {
      throw new CliError("sign-in was denied in the browser. Run 'pipeshub login' to try again.", EXIT.UNAUTHENTICATED);
    }
    if (error === "expired_token") break;
    throw new CliError(`sign-in failed: ${oauthError(r)}`, EXIT.UNAUTHENTICATED);
  }
  await rm(pendingPath(env), { force: true });
  throw new CliError("the sign-in code expired before it was approved. Run 'pipeshub login' again.", EXIT.UNAUTHENTICATED);
}

/**
 * The stored sign-in for `origin` (any origin when null), refreshed if it is
 * about to expire. Null when there is none, or it belongs to another origin:
 * a token is only ever sent back to the instance that issued it.
 */
export async function storedLogin(
  origin: string | null,
  insecureHttp: boolean,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StoredLogin | null> {
  const path = credentialsPath(env);
  const stored = await readStored(path);
  if (stored === null || (origin !== null && stored.origin !== origin)) return null;
  if (stored.expiresAt - REFRESH_MARGIN_MS > Date.now()) return stored;
  // A trial token has no refresh token and is good until its expiry.
  if (stored.sandbox && stored.expiresAt > Date.now()) return stored;
  if (!stored.refreshToken || !stored.tokenEndpoint || !stored.clientId) throw signInAgain(stored);

  const r = await postForm(stored.tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: stored.clientId,
  }, insecureHttp);
  if (r.status === 200) {
    const endpoints: Endpoints = {
      origin: stored.origin,
      clientId: stored.clientId,
      tokenEndpoint: stored.tokenEndpoint,
      ...(stored.revocationEndpoint ? { revocationEndpoint: stored.revocationEndpoint } : {}),
    };
    const next = toStored(endpoints, r.body, stored.refreshToken);
    // Write only over the file this refresh started from. A logout, or another
    // process's refresh or sign-in, since then wins; our new tokens are revoked.
    const current = await readStored(path);
    if (current?.refreshToken !== stored.refreshToken) {
      await revokeAll(next, insecureHttp);
      if (current?.origin === stored.origin && current.expiresAt > Date.now()) return current;
      throw signInAgain(stored);
    }
    await writeSecretFile(path, next);
    return next;
  }
  // The server rotates refresh tokens, so a second CLI process refreshing at
  // the same moment makes ours stale. If the file moved on meanwhile, use it.
  const current = await readStored(path);
  if (current?.origin === stored.origin && current.refreshToken !== stored.refreshToken && current.expiresAt > Date.now()) {
    return current;
  }
  // A server error or rate limit says nothing about the refresh token, which is still good.
  if (r.status >= 500 || r.status === 429) {
    throw new CliError(
      `could not refresh the sign-in to ${stored.origin} (${oauthError(r)}). Try again shortly.`,
      r.status === 429 ? EXIT.RATE_LIMITED : EXIT.ERROR,
    );
  }
  throw signInAgain(stored);
}

/** Ask to revoke the refresh and access token; true when the server answered 200 to either. */
async function revokeAll(login: StoredLogin, insecureHttp: boolean): Promise<boolean> {
  if (!login.revocationEndpoint) return false;
  // Thrown, not swallowed with the request errors below: refusing to send is not "best effort".
  assertTransport(new URL(login.revocationEndpoint).origin, insecureHttp);
  let answered = false;
  for (const [token, hint] of [[login.refreshToken, "refresh_token"], [login.accessToken, "access_token"]] as const) {
    if (!token) continue;
    const r = await postForm(login.revocationEndpoint, { token, token_type_hint: hint, client_id: login.clientId ?? "" }, insecureHttp)
      .catch(() => null);
    answered ||= r?.status === 200;
  }
  return answered;
}

function signInAgain(stored: StoredLogin): CliError {
  return new CliError(
    stored.sandbox
      ? `your trial workspace on ${stored.origin} has closed. Run 'pipeshub init' for a new one, or 'pipeshub login' to sign in.`
      : `your sign-in to ${stored.origin} has expired. Run 'pipeshub login' again.`,
    EXIT.UNAUTHENTICATED,
  );
}

/**
 * Ask the server to revoke both tokens (best effort) and forget the sign-in.
 * RFC 7009 answers 200 whatever happened, so this reports the request, not the outcome.
 */
export async function logout(
  insecureHttp: boolean,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ origin: string | null; revokeRequested: boolean }> {
  // Refuse before touching anything, so the sign-in is still there to log out with --insecure-http.
  const current = await readStored(credentialsPath(env));
  if (current?.revocationEndpoint) assertTransport(new URL(current.revocationEndpoint).origin, insecureHttp);
  // Drop the pending sign-in and take the file away first, so a refresh or
  // `login --wait` still in flight finds nothing and revokes its own tokens.
  await rm(pendingPath(env), { force: true });
  const path = credentialsPath(env);
  let first: StoredLogin | null = null;
  let revokeRequested = false;
  // A second pass catches a write that landed between that process's re-read and its rename.
  for (let pass = 0; pass < 2; pass++) {
    const taken = `${path}.logout-${process.pid}-${pass}`;
    const moved = await rename(path, taken).then(() => true, () => false);
    if (!moved) continue;
    const stored = await readStored(taken);
    if (stored?.revocationEndpoint) {
      try {
        assertTransport(new URL(stored.revocationEndpoint).origin, insecureHttp);
      } catch (e) {
        // Put it back so `logout --insecure-http` can still revoke it.
        await rename(taken, path).catch(() => undefined);
        throw e;
      }
    }
    await rm(taken, { force: true });
    if (stored === null) continue;
    first ??= stored;
    revokeRequested = (await revokeAll(stored, insecureHttp)) || revokeRequested;
  }
  return { origin: first?.origin ?? null, revokeRequested };
}
