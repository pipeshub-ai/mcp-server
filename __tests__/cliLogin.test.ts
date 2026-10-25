import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `pipeshub login` as a person or an agent runs it, against a fake instance
// that speaks the device flow. What can go wrong quietly: a token printed or
// left world-readable, a stored token sent to a different origin, a refresh
// that loses the rotated refresh token, a denial that exits 0.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");

const jwt = (claims: Record<string, unknown>) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

let server: ReturnType<typeof Bun.serve>;
let origin = "";
let home = "";
let deviceEnabled = true;
let decision: "approve" | "deny" = "approve";
let polls = 0;
let noRefresh = false;
let refreshDown = false;
let elsewhere = "";
let redirectToken = false;
let verificationOrigin = "";
let completeOrigin = "";
// Runs just before a token response: stands in for a `pipeshub logout` in another terminal.
let beforeTokens: (() => Promise<void>) | null = null;
let scope = "kb:read kb:write";
let issued = 0;
const seen: Array<{ path: string; form?: Record<string, string>; authorization?: string | null }> = [];

function mint() {
  issued += 1;
  return {
    access_token: jwt({ userId: "u-1", orgId: "o-1", fullName: "Ada", scope, n: issued }),
    ...(noRefresh ? {} : { refresh_token: `refresh-${issued}` }),
    token_type: "Bearer",
    expires_in: 3600,
  };
}

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === "/.well-known/openid-configuration") {
        const base = `${elsewhere || origin}/api/v1/oauth2`;
        return Response.json({
          token_endpoint: `${base}/token`,
          revocation_endpoint: `${base}/revoke`,
          ...(deviceEnabled
            ? { device_authorization_endpoint: `${base}/device_authorization`, pipeshub_device_client_id: "pipeshub-agent" }
            : {}),
        });
      }
      if (path === "/mcp") {
        seen.push({ path, authorization: req.headers.get("authorization") });
        const body = (await req.json()) as { id: number };
        const reply = { jsonrpc: "2.0", id: body.id, result: { tools: [{ name: "pipeshub_search" }] } };
        return new Response(`event: message\ndata: ${JSON.stringify(reply)}\n\n`, {
          headers: { "content-type": "text/event-stream" },
        });
      }
      const form = Object.fromEntries(new URLSearchParams(await req.text()));
      seen.push({ path, form });
      if (path.endsWith("/device_authorization")) {
        polls = 0;
        return Response.json({
          device_code: "dev-secret",
          user_code: "ABCD-EFGH",
          verification_uri: `${verificationOrigin || origin}/oauth/device`,
          verification_uri_complete: `${completeOrigin || verificationOrigin || origin}/oauth/device?user_code=ABCD-EFGH`,
          expires_in: 60,
          interval: 1,
        });
      }
      if (redirectToken && path.endsWith("/token")) {
        return new Response("", { status: 307, headers: { location: `${origin}/elsewhere/token` } });
      }
      if (path.endsWith("/token") && form["grant_type"]?.endsWith("device_code")) {
        polls += 1;
        if (polls < 2) return Response.json({ error: "authorization_pending" }, { status: 400 });
        if (decision === "deny") return Response.json({ error: "access_denied" }, { status: 400 });
        await beforeTokens?.();
        return Response.json(mint());
      }
      if (path.endsWith("/token") && form["grant_type"] === "refresh_token") {
        if (refreshDown) return Response.json({ error: "server_error" }, { status: 503 });
        if (form["refresh_token"] !== `refresh-${issued}`) return Response.json({ error: "invalid_grant" }, { status: 400 });
        await beforeTokens?.();
        return Response.json(mint());
      }
      if (path.endsWith("/revoke")) return new Response("", { status: 200 });
      return new Response("not found", { status: 404 });
    },
  });
  origin = `http://127.0.0.1:${server.port}`;
});

afterAll(() => server.stop(true));

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pipeshub-login-"));
  deviceEnabled = true;
  decision = "approve";
  noRefresh = false;
  refreshDown = false;
  elsewhere = "";
  redirectToken = false;
  verificationOrigin = "";
  completeOrigin = "";
  beforeTokens = null;
  scope = "kb:read kb:write";
  seen.length = 0;
});

async function cli(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
    env: { PATH: process.env["PATH"] ?? "", HOME: home, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}

const credentials = () => join(home, ".config", "pipeshub", "credentials.json");
const mode = async (p: string) => (await stat(p)).mode & 0o777;

describe("pipeshub login", () => {
  test("an agent hands over the link, then finishes; the token is stored 0600 and never printed", async () => {
    const start = await cli(["login", "--url", origin, "--no-wait"]);
    expect(start.code).toBe(0);
    expect(JSON.parse(start.stdout)).toMatchObject({
      userCode: "ABCD-EFGH",
      verificationUriComplete: `${origin}/oauth/device?user_code=ABCD-EFGH`,
      next: "pipeshub login --wait",
    });
    expect(start.stdout).not.toContain("dev-secret");

    const done = await cli(["login", "--wait"]);
    expect(done.code).toBe(0);
    expect(JSON.parse(done.stdout)).toMatchObject({ loggedIn: true, origin, user: "Ada", scopes: ["kb:read", "kb:write"] });
    for (const out of [done.stdout, done.stderr]) {
      expect(out).not.toContain("refresh-");
      expect(out).not.toContain("e30.");
    }
    expect(await mode(credentials())).toBe(0o600);
    expect(await mode(join(home, ".config", "pipeshub"))).toBe(0o700);
    await expect(stat(join(home, ".config", "pipeshub", "pending-login.json"))).rejects.toThrow();
  });

  test("later commands use the stored sign-in with no environment at all", async () => {
    await cli(["login", "--url", origin]);
    const status = await cli(["auth", "status"]);
    expect(status.code).toBe(0);
    expect(JSON.parse(status.stdout)).toMatchObject({ connected: true, baseUrl: origin, tokenSource: "pipeshub login" });
    expect(seen.at(-1)?.authorization).toStartWith("Bearer e30.");
  });

  test("a stored sign-in is never sent to a different origin", async () => {
    await cli(["login", "--url", origin]);
    seen.length = 0;
    const r = await cli(["auth", "status"], { PIPESHUB_BASE_URL: "http://127.0.0.1:9" });
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("No PipesHub credential found");
    expect(r.stderr).toContain("pipeshub login --url http://127.0.0.1:9");
    expect(seen).toHaveLength(0);
  });

  test("the environment still wins over a stored sign-in", async () => {
    await cli(["login", "--url", origin]);
    await cli(["auth", "status"], { PIPESHUB_TOKEN: "env-token", PIPESHUB_BASE_URL: origin });
    expect(seen.at(-1)?.authorization).toBe("Bearer env-token");
  });

  test("an expiring token is refreshed, and the rotated refresh token is kept", async () => {
    await cli(["login", "--url", origin]);
    const before = JSON.parse(await readFile(credentials(), "utf8"));
    await writeFile(credentials(), JSON.stringify({ ...before, expiresAt: Date.now() - 1 }), { mode: 0o600 });

    expect((await cli(["auth", "status"])).code).toBe(0);
    const after = JSON.parse(await readFile(credentials(), "utf8"));
    expect(after.refreshToken).not.toBe(before.refreshToken);
    expect(after.expiresAt).toBeGreaterThan(Date.now());
    expect(seen.at(-1)?.authorization).toBe(`Bearer ${after.accessToken}`);
    expect(await mode(credentials())).toBe(0o600);
  });

  test("an instance that issues no refresh token is named at login, not an hour later", async () => {
    noRefresh = true;
    const r = await cli(["login", "--url", origin]);
    expect(JSON.parse(r.stdout).note).toContain("issued no refresh token");
  });

  test("a sign-in short of scopes points at the instance, not at minting a token", async () => {
    scope = "kb:read";
    await cli(["login", "--url", origin]);
    const warning = JSON.parse((await cli(["auth", "status"])).stdout).warning as string;
    expect(warning).toContain("run 'pipeshub login' again");
    expect(warning).not.toContain("personal access token");
  });

  test("a refresh the server refuses says to sign in again", async () => {
    await cli(["login", "--url", origin]);
    const before = JSON.parse(await readFile(credentials(), "utf8"));
    await writeFile(credentials(), JSON.stringify({ ...before, refreshToken: "stale", expiresAt: 0 }), { mode: 0o600 });
    const r = await cli(["auth", "status"]);
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("Run 'pipeshub login' again");
  });

  test("a server error during refresh is not reported as an expired sign-in", async () => {
    await cli(["login", "--url", origin]);
    const before = JSON.parse(await readFile(credentials(), "utf8"));
    await writeFile(credentials(), JSON.stringify({ ...before, expiresAt: 0 }), { mode: 0o600 });
    refreshDown = true;
    const r = await cli(["auth", "status"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Try again shortly");
    expect(r.stderr).not.toContain("expired");
    // The refresh token is kept for the next try.
    expect(JSON.parse(await readFile(credentials(), "utf8")).refreshToken).toBe(before.refreshToken);
  });

  test("a stored file missing fields reads as not signed in, not as a crash", async () => {
    await cli(["login", "--url", origin]);
    await writeFile(credentials(), JSON.stringify({ origin, accessToken: "x" }), { mode: 0o600 });
    const r = await cli(["auth", "status"]);
    expect(r.stderr).toContain("run 'pipeshub login'");
  });

  test("a blank --url is a usage error, not a sign-in to Cloud", async () => {
    const r = await cli(["login", "--url", "", "--no-wait"]);
    expect(r.code).toBe(2);
    expect(seen).toHaveLength(0);
  });

  test("--wait for a different --url than the pending sign-in is refused", async () => {
    await cli(["login", "--url", origin, "--no-wait"]);
    const r = await cli(["login", "--wait", "--url", "http://127.0.0.1:9"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(`in progress is for ${origin}`);
  });

  test("sign-in endpoints on another origin are refused before any token is sent", async () => {
    elsewhere = "http://127.0.0.2:9";
    const r = await cli(["login", "--url", origin, "--no-wait"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("pipeshub login --url http://127.0.0.2:9");
    expect(seen.filter((s) => s.form)).toHaveLength(0);
  });

  test("a redirect on the token endpoint is not followed with the device code", async () => {
    redirectToken = true;
    const r = await cli(["login", "--url", origin]);
    expect(r.code).not.toBe(0);
    expect(seen.some((s) => s.path === "/elsewhere/token")).toBe(false);
    await expect(stat(credentials())).rejects.toThrow();
  });

  test("a cleartext verification link to a public host is refused", async () => {
    verificationOrigin = "http://pipeshub.example.com";
    const r = await cli(["login", "--url", origin, "--no-wait"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("cleartext");
  });

  test("a cleartext public link in verification_uri_complete alone is refused", async () => {
    completeOrigin = "http://pipeshub.example.com";
    const r = await cli(["login", "--url", origin, "--no-wait"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("cleartext");
  });

  test("a logout during a refresh is not undone by the refresh", async () => {
    await cli(["login", "--url", origin]);
    const before = JSON.parse(await readFile(credentials(), "utf8"));
    await writeFile(credentials(), JSON.stringify({ ...before, expiresAt: 0 }), { mode: 0o600 });
    beforeTokens = () => rm(credentials(), { force: true });
    seen.length = 0;
    const r = await cli(["auth", "status"]);
    expect(r.code).toBe(3);
    await expect(stat(credentials())).rejects.toThrow();
    // The tokens the refresh just minted are revoked, not left valid.
    expect(seen.find((x) => x.path.endsWith("/revoke"))?.form?.["token"]).toBe(`refresh-${issued}`);
  });

  test("a logout while login --wait polls is not undone when approval lands", async () => {
    await cli(["login", "--url", origin, "--no-wait"]);
    beforeTokens = () => rm(join(home, ".config", "pipeshub", "pending-login.json"), { force: true });
    seen.length = 0;
    const r = await cli(["login", "--wait"]);
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("cancelled");
    await expect(stat(credentials())).rejects.toThrow();
    expect(seen.some((x) => x.path.endsWith("/revoke"))).toBe(true);
  });

  test("a denial in the browser exits 3", async () => {
    decision = "deny";
    const r = await cli(["login", "--url", origin]);
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("denied");
    await expect(stat(credentials())).rejects.toThrow();
  });

  test("an instance without device sign-in points at a personal access token", async () => {
    deviceEnabled = false;
    const r = await cli(["login", "--url", origin]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("Personal Access Tokens");
  });

  test("--wait with nothing started is a usage error", async () => {
    expect((await cli(["login", "--wait"])).code).toBe(2);
  });

  test("a public cleartext origin is refused before anything is sent", async () => {
    const r = await cli(["login", "--url", "http://pipeshub.example.com"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("cleartext");
  });

  test("logout asks to revoke both tokens as a public client and forgets the sign-in", async () => {
    await cli(["login", "--url", origin]);
    const stored = JSON.parse(await readFile(credentials(), "utf8"));
    const r = await cli(["logout"]);
    expect(JSON.parse(r.stdout)).toMatchObject({ loggedOut: true, origin, revokeRequested: true });
    const revokes = seen.filter((s) => s.path.endsWith("/revoke")).map((s) => s.form);
    expect(revokes).toEqual([
      { token: stored.refreshToken, token_type_hint: "refresh_token", client_id: "pipeshub-agent" },
      { token: stored.accessToken, token_type_hint: "access_token", client_id: "pipeshub-agent" },
    ]);
    await expect(stat(credentials())).rejects.toThrow();
    expect((await cli(["auth", "status"])).stderr).toContain("run 'pipeshub login'");
  });
});
