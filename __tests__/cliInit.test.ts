import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `pipeshub init` against a fake instance. What can go wrong quietly: the
// token printed, a real sign-in overwritten, a refusal that exits 0, or the
// trial token sent somewhere other than the instance that issued it.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
const TOKEN = "phpat_trial-secret";

let server: ReturnType<typeof Bun.serve>;
let origin = "";
let home = "";
let reply: () => Response = () => new Response("", { status: 404 });
const seen: Array<{ path: string; body?: unknown; authorization?: string | null }> = [];

const created = (hoursLeft = 72) =>
  Response.json(
    {
      workspaceId: "ws-1",
      baseUrl: origin,
      mcpUrl: `${origin}/mcp`,
      token: TOKEN,
      expiresAt: new Date(Date.now() + hoursLeft * 3_600_000).toISOString(),
      limits: { documents: 1000, uploadBytes: 524288000, aiBudgetUsd: 1 },
    },
    { status: 201 },
  );

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === "/api/v1/sandboxes") {
        seen.push({ path, body: await req.json().catch(() => null) });
        return reply();
      }
      if (path === "/mcp") {
        seen.push({ path, authorization: req.headers.get("authorization") });
        const body = (await req.json()) as { id: number };
        const result = { jsonrpc: "2.0", id: body.id, result: { tools: [{ name: "pipeshub_search" }] } };
        return new Response(`event: message\ndata: ${JSON.stringify(result)}\n\n`, {
          headers: { "content-type": "text/event-stream" },
        });
      }
      return new Response("not found", { status: 404 });
    },
  });
  origin = `http://127.0.0.1:${server.port}`;
});

afterAll(() => server.stop(true));

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "pipeshub-init-"));
  reply = () => created();
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

async function storeLogin(value: Record<string, unknown>) {
  await mkdir(join(home, ".config", "pipeshub"), { recursive: true });
  await writeFile(credentials(), JSON.stringify(value));
}

describe("pipeshub init", () => {
  test("creates a trial workspace, stores its token 0600, and never prints it", async () => {
    const r = await cli(["init", "--url", origin]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({
      workspaceId: "ws-1",
      origin,
      mcpUrl: `${origin}/mcp`,
      limits: { documents: 1000, aiBudgetUsd: 1 },
      credentials: credentials(),
    });
    for (const out of [r.stdout, r.stderr]) expect(out).not.toContain("trial-secret");
    expect((await stat(credentials())).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(credentials(), "utf8"))).toMatchObject({
      origin,
      accessToken: TOKEN,
      sandbox: { workspaceId: "ws-1" },
    });
    expect(seen[0]?.body).toEqual({});
  });

  test("later commands use the trial token, only on its own origin", async () => {
    await cli(["init", "--url", origin]);
    const status = await cli(["auth", "status"]);
    expect(status.code).toBe(0);
    expect(seen.at(-1)?.authorization).toBe(`Bearer ${TOKEN}`);

    const other = await cli(["auth", "status"], { PIPESHUB_BASE_URL: "http://127.0.0.1:9" });
    expect(other.code).toBe(3);
  });

  test("tags the request with the client it installs for", async () => {
    // A client that writes a file in HOME, so nothing outside the test is touched.
    const r = await cli(["init", "--url", origin, "--client", "cursor"]);
    expect(r.code).toBe(0);
    expect(seen[0]?.body).toEqual({ client: "cursor" });
    expect(JSON.parse(r.stdout).mcp).toMatchObject({ client: "cursor", wrote: join(home, ".cursor", "mcp.json") });
    const config = await readFile(join(home, ".cursor", "mcp.json"), "utf8");
    expect(config).not.toContain("trial-secret");
  });

  test("refuses to replace a real sign-in without --force", async () => {
    await storeLogin({ origin, clientId: "pipeshub-agent", tokenEndpoint: `${origin}/t`, accessToken: "e30.x.y", expiresAt: Date.now() + 3_600_000 });
    const r = await cli(["init", "--url", origin]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("pipeshub init --force");
    expect(seen).toHaveLength(0);

    expect((await cli(["init", "--url", origin, "--force"])).code).toBe(0);
  });

  test("refuses a second trial while the first is open, but not once it has closed", async () => {
    await cli(["init", "--url", origin]);
    seen.length = 0;
    expect((await cli(["init", "--url", origin])).code).toBe(2);
    expect(seen).toHaveLength(0);

    await storeLogin({ origin, accessToken: TOKEN, expiresAt: Date.now() - 1000, sandbox: { workspaceId: "old" } });
    expect((await cli(["init", "--url", origin])).code).toBe(0);
  });

  test("a closed trial says how to get a new one", async () => {
    await storeLogin({ origin, accessToken: TOKEN, expiresAt: Date.now() - 1000, sandbox: { workspaceId: "old" } });
    const r = await cli(["auth", "status"]);
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("trial workspace");
    expect(r.stderr).toContain("pipeshub init");
  });

  test("answers each refusal with its own exit code and next step", async () => {
    reply = () => new Response("", { status: 404 });
    let r = await cli(["init", "--url", origin]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(`pipeshub login --url ${origin}`);

    reply = () => Response.json({}, { status: 429, headers: { "retry-after": "1200" } });
    r = await cli(["init", "--url", origin]);
    expect(r.code).toBe(5);
    expect(r.stderr).toContain("20 min");

    reply = () => Response.json({}, { status: 503 });
    r = await cli(["init", "--url", origin]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("paused");
    await expect(stat(credentials())).rejects.toThrow();
  });

  test("says when PIPESHUB_TOKEN would shadow the trial", async () => {
    const r = await cli(["init", "--url", origin], { PIPESHUB_TOKEN: "env-token" });
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).note).toContain("PIPESHUB_TOKEN");
  });

  test("rejects an unknown client before creating anything", async () => {
    const r = await cli(["init", "--url", origin, "--client", "notepad"]);
    expect(r.code).toBe(2);
    expect(seen).toHaveLength(0);
  });
});
