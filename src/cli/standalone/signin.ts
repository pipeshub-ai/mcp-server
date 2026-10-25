// Sign in to the local stack without a browser trip, and without a token ever
// reaching a client config. The CLI starts its usual device-code sign-in
// (login.ts), and on this computer's own PipesHub approves the code itself:
//
//   fresh stack  -> create the first account with a generated password, sign in
//                   as it over the API, and approve the code;
//   later runs   -> the same stored account approves it again;
//   an account we did not create -> print the link and code (the browser flow).
//
// The tokens end up in credentials.json (0600), the CLI's own store. The
// generated account password is kept next to it (local-account.json, 0600), so
// the person can open the web UI and so a lapsed sign-in can be renewed.

import { randomBytes } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import { CliError } from "../config.js";
import { configDir, credentialsPath, startLogin, storedLogin, waitForLogin, writeSecretFile, type StoredLogin } from "../login.js";

export interface LocalAccount {
  origin: string;
  email: string;
  password: string;
  /** Id of the access token this command minted, so uninstall can revoke it. */
  tokenId?: string;
}

export const isLoopback = (origin: string) => ["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname);

export const accountPath = (env: NodeJS.ProcessEnv = process.env) => join(configDir(env), "local-account.json");

export async function readAccount(env: NodeJS.ProcessEnv = process.env): Promise<LocalAccount | null> {
  try {
    const a = JSON.parse(await readFile(accountPath(env), "utf8")) as Partial<LocalAccount>;
    return a.origin && a.email && a.password ? (a as LocalAccount) : null;
  } catch {
    return null;
  }
}

export const forgetAccount = (env: NodeJS.ProcessEnv = process.env) => rm(accountPath(env), { force: true });

async function api(origin: string, path: string, init: RequestInit = {}): Promise<{ status: number; headers: Headers; body: Record<string, unknown> }> {
  const res = await fetch(`${origin}${path}`, { ...init, redirect: "error", signal: AbortSignal.timeout(120_000) });
  return { status: res.status, headers: res.headers, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** A password session for the account, or null when the stack rejects it. */
async function session(a: LocalAccount): Promise<string | null> {
  const init = await api(a.origin, "/api/v1/userAccount/initAuth", json({ email: a.email }));
  const token = init.headers.get("x-session-token");
  if (init.status !== 200 || !token) return null;
  const auth = await api(a.origin, "/api/v1/userAccount/authenticate", {
    ...json({ method: "password", credentials: { password: a.password }, email: a.email }),
    headers: { "content-type": "application/json", "x-session-token": token },
  });
  const access = auth.body["accessToken"];
  return auth.status === 200 && typeof access === "string" ? access : null;
}

async function createFirstAccount(origin: string, email: string, env: NodeJS.ProcessEnv): Promise<LocalAccount | null> {
  const exists = await api(origin, "/api/v1/org/exists");
  if (exists.status !== 200 || exists.body["exists"] === true) return null;
  // Meets the password rules (upper, lower, digit, symbol); never printed.
  const account: LocalAccount = { origin, email, password: "Aa1!" + randomBytes(18).toString("base64url") };
  // Saved first: if the process dies after the stack made the account, the password is not lost.
  await writeSecretFile(accountPath(env), account);
  const made = await api(origin, "/api/v1/org", json({
    accountType: "business",
    contactEmail: email,
    registeredName: "Local",
    shortName: "local",
    adminFullName: "Local Developer",
    password: account.password,
    sendEmail: false,
  }));
  if (made.status >= 300) {
    await forgetAccount(env);
    throw new CliError(`could not create the first account on ${origin} (HTTP ${made.status}). Open ${origin} in a browser to create it, then run 'pipeshub login --url ${origin}'.`);
  }
  return account;
}

export interface SignIn {
  /** "already" = a valid sign-in existed; "automatic" = made by this command; "browser" = the person approved it. */
  how: "already" | "automatic" | "browser";
  createdAccount: boolean;
  email?: string;
}

/** What an agent may do through the CLI: the agent preset plus knowledge writes and repository indexing. */
const WANTED_SCOPES = ["conversation:chat", "semantic:write", "kb:read", "kb:write", "kb:upload", "user:read", "connector:read", "code:read", "code:write"];
const PAT_DAYS = 365;

/**
 * A personal access token for the signed-in account, kept in the CLI's own
 * credential file. The account's password session mints it (the API accepts
 * no other caller for this), so nothing is pasted and nothing is approved in a
 * browser.
 *
 * shortcut: the device-code grant would give a refreshable token tied to the
 * "PipesHub agent" app, but the slim server cannot create that app yet
 * (discovery fails with "no org context is bound"). A token lasts PAT_DAYS;
 * `pipeshub init` mints a new one when it lapses. Switch back when slim can.
 */
async function mintToken(origin: string, access: string, env: NodeJS.ProcessEnv): Promise<void> {
  const headers = { "content-type": "application/json", authorization: `Bearer ${access}` };
  const avail = await api(origin, "/api/v1/personal-access-tokens/scopes", { headers });
  const names = JSON.stringify(avail.body);
  const scopes = WANTED_SCOPES.filter((s) => names.includes(`"${s}"`));
  const made = await api(origin, "/api/v1/personal-access-tokens", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: `pipeshub CLI on ${hostname()}`, ...(scopes.length ? { scopes } : {}), expiryDays: PAT_DAYS }),
  });
  const token = (made.body["token"] ?? {}) as Record<string, unknown>;
  const secret = token["accessToken"];
  if (made.status !== 201 || typeof secret !== "string") {
    throw new CliError(`could not create the CLI's access token on ${origin} (HTTP ${made.status}).`);
  }
  const stored: StoredLogin = {
    origin,
    clientId: "personal-access-token",
    tokenEndpoint: `${origin}/api/v1/oauth2/token`,
    accessToken: secret,
    expiresAt: Date.now() + (PAT_DAYS - 1) * 86_400_000,
  };
  await writeSecretFile(credentialsPath(env), stored);
  const account = await readAccount(env);
  if (account && typeof token["id"] === "string") await writeSecretFile(accountPath(env), { ...account, tokenId: token["id"] });
}

/** Revoke the token `mintToken` made, when the stored account can still sign in. Best effort. */
export async function revokeMintedToken(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const account = await readAccount(env);
  if (!account?.tokenId) return false;
  const access = await session(account).catch(() => null);
  if (!access) return false;
  const res = await fetch(`${account.origin}/api/v1/personal-access-tokens/${account.tokenId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${access}` },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  return res?.ok === true;
}

export async function localSignIn(
  origin: string,
  opts: { email: string; env?: NodeJS.ProcessEnv; say: (s: string) => void },
): Promise<SignIn> {
  const env = opts.env ?? process.env;
  const existing = await storedLogin(origin, false, env).catch(() => null);
  if (existing) return { how: "already", createdAccount: false };

  // Only this computer's own PipesHub may have an account made for the person.
  const local = isLoopback(origin);
  let account = local ? await readAccount(env) : null;
  if (account && account.origin !== origin) account = null;
  let created = false;
  if (!account && local) {
    account = await createFirstAccount(origin, opts.email, env);
    created = account !== null;
  }
  if (account) {
    let access = await session(account);
    // A new account's event reaches the other services a moment later.
    for (let i = 0; !access && created && i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      access = await session(account);
    }
    if (access) {
      await mintToken(origin, access, env);
      return { how: "automatic", createdAccount: created, email: account.email };
    }
    opts.say("The stored local account no longer signs in; falling back to the browser.");
  }

  // An account this command did not create: the usual device-code sign-in.
  const pending = await startLogin(origin, false, env);
  opts.say(`Open ${pending.verificationUriComplete} and confirm the code ${pending.userCode}. Waiting for approval...`);
  await waitForLogin(pending, false, env);
  return { how: "browser", createdAccount: false };
}
