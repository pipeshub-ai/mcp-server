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

export interface StoredLogin extends Endpoints {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
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

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Write via rename so a reader never sees half a file, with 0600 from the first byte. */
async function writeSecretFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, path);
}

type OAuthReply = { status: number; body: Record<string, unknown> };

async function postForm(url: string, form: Record<string, string>): Promise<OAuthReply> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(form),
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
  // These receive the device and refresh tokens, so they meet the origin's transport rule.
  for (const endpoint of [deviceEndpoint, tokenEndpoint, revocationEndpoint]) {
    if (endpoint) assertTransport(new URL(endpoint).origin, insecureHttp);
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
  const r = await postForm(deviceEndpoint, { client_id: endpoints.clientId });
  const deviceCode = str(r.body["device_code"]);
  const userCode = str(r.body["user_code"]);
  const verificationUri = str(r.body["verification_uri"]);
  if (r.status !== 200 || !deviceCode || !userCode || !verificationUri) {
    throw new CliError(`sign-in could not start: ${oauthError(r)}`);
  }
  const pending: PendingLogin = {
    ...endpoints,
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: str(r.body["verification_uri_complete"]) ?? verificationUri,
    intervalSeconds: Number(r.body["interval"]) || 5,
    expiresAt: Date.now() + (Number(r.body["expires_in"]) || 600) * 1000,
  };
  await writeSecretFile(pendingPath(env), pending);
  return pending;
}

export function readPending(env: NodeJS.ProcessEnv = process.env): Promise<PendingLogin | null> {
  return readJsonFile<PendingLogin>(pendingPath(env));
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
    });
    if (r.status === 200) {
      const stored = toStored(pending, r.body);
      await writeSecretFile(credentialsPath(env), stored);
      await rm(pendingPath(env), { force: true });
      return stored;
    }
    const error = str(r.body["error"]);
    if (error === "authorization_pending") continue;
    if (error === "slow_down") {
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
  env: NodeJS.ProcessEnv = process.env,
): Promise<StoredLogin | null> {
  const path = credentialsPath(env);
  const stored = await readJsonFile<StoredLogin>(path);
  if (!stored?.accessToken || (origin !== null && stored.origin !== origin)) return null;
  if (stored.expiresAt - REFRESH_MARGIN_MS > Date.now()) return stored;
  if (!stored.refreshToken) throw signInAgain(stored.origin);

  const r = await postForm(stored.tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: stored.clientId,
  });
  if (r.status === 200) {
    const next = toStored(stored, r.body, stored.refreshToken);
    await writeSecretFile(path, next);
    return next;
  }
  // The server rotates refresh tokens, so a second CLI process refreshing at
  // the same moment makes ours stale. If the file moved on meanwhile, use it.
  const current = await readJsonFile<StoredLogin>(path);
  if (current && current.refreshToken !== stored.refreshToken && current.expiresAt > Date.now()) return current;
  throw signInAgain(stored.origin);
}

function signInAgain(origin: string): CliError {
  return new CliError(
    `your sign-in to ${origin} has expired. Run 'pipeshub login' again.`,
    EXIT.UNAUTHENTICATED,
  );
}

/** Revoke the refresh token (best effort) and forget the sign-in. */
export async function logout(env: NodeJS.ProcessEnv = process.env): Promise<{ origin: string | null; revoked: boolean }> {
  const path = credentialsPath(env);
  const stored = await readJsonFile<StoredLogin>(path);
  let revoked = false;
  if (stored?.revocationEndpoint && stored.refreshToken) {
    const r = await postForm(stored.revocationEndpoint, {
      token: stored.refreshToken,
      token_type_hint: "refresh_token",
      client_id: stored.clientId,
    }).catch(() => null);
    revoked = r?.status === 200;
  }
  await rm(path, { force: true });
  await rm(pendingPath(env), { force: true });
  return { origin: stored?.origin ?? null, revoked };
}
