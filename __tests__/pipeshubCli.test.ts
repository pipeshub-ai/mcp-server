import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFakeMcp, textReply, type FakeMcp } from "./helpers/fakePipeshubMcp.js";

// The `pipeshub` binary as an agent runs it: a child process with only the
// environment it is given, whose exit code and stdout are the contract. HOME
// points at a temporary directory and the only credential is a fake one, so
// nothing here can read a real keychain or reach a real instance.

const ENTRY = join(import.meta.dir, "..", "src", "cli", "pipeshub.ts");
const TOKEN = "fake-cli-token-0000";

let mcp: FakeMcp;
let home: string;

beforeAll(async () => {
  mcp = startFakeMcp();
  home = await mkdtemp(join(tmpdir(), "mcpcov-init-cli-"));
});

afterAll(async () => {
  mcp.stop();
  await rm(home, { recursive: true, force: true });
});

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

async function cli(args: string[], env: Record<string, string> = {}): Promise<Run> {
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
  // Whatever the command, the token never appears in its output.
  expect(stdout).not.toContain(TOKEN);
  expect(stderr).not.toContain(TOKEN);
  return { code, stdout, stderr };
}

const connected = () => ({ PIPESHUB_TOKEN: TOKEN, PIPESHUB_BASE_URL: mcp.origin });

describe("usage", () => {
  test("no arguments prints the usage and exits 0", async () => {
    const r = await cli([]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("USAGE\n  pipeshub <command> [options]");
    expect((await cli(["--help"])).stdout).toBe(r.stdout);
  });

  test("an unknown option is a usage error, not silently ignored", async () => {
    const r = await cli(["search", "x", "--tokn", "abc"], connected());
    expect(r.code).toBe(2);
    expect(r.stderr).toBe("pipeshub: unknown option: --tokn\n");
  });

  test("an option missing its value says which one", async () => {
    const r = await cli(["search", "x", "--limit"], connected());
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("--limit requires a value");
  });

  test("--limit outside 1-100 and a non-positive --max-chars are usage errors", async () => {
    expect((await cli(["search", "x", "--limit", "0"], connected())).code).toBe(2);
    expect((await cli(["search", "x", "--limit", "2.5"], connected())).code).toBe(2);
    expect((await cli(["get", "r", "--max-chars", "0"], connected())).code).toBe(2);
  });

  test("the credential-setting subcommands refuse, and say where credentials come from", async () => {
    for (const sub of ["set", "import", "login", "add"]) {
      const r = await cli(["auth", sub]);
      expect(r.code).toBe(2);
      expect(r.stderr).toContain(`pipeshub auth ${sub} does not exist, deliberately.`);
      expect(r.stderr).toContain("pipeshub auth connect-help");
    }
  });

  test("commands that need an argument say so", async () => {
    expect((await cli(["search"], connected())).stderr).toContain("search requires a query");
    expect((await cli(["ask", "  "], connected())).stderr).toContain("ask requires a question");
    expect((await cli(["get"], connected())).stderr).toContain("get requires a recordId");
    expect((await cli(["auth"], connected())).stderr).toContain("unknown subcommand: auth (none)");
    expect((await cli(["frobnicate"], connected())).stderr).toContain("unknown command: frobnicate");
  });

  test("directory groups explains why v1 does not have it", async () => {
    const r = await cli(["directory", "groups"], connected());
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("v1 supports 'directory whoami' only");
  });

  test("--mode accepts internal and web only, and explains the others", async () => {
    const r = await cli(["ask", "q", "--mode", "deep"], connected());
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('--mode must be "internal" or "web" (got "deep")');
  });
});

describe("missing configuration", () => {
  test("no URL and no token names both, and points at connect-help", async () => {
    const r = await cli(["search", "x"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("PIPESHUB_BASE_URL is not set");
    expect(r.stderr).toContain("$PIPESHUB_TOKEN is unset");
    expect(r.stderr).toContain("pipeshub auth connect-help");
  });

  test("a URL with no token is exit 3", async () => {
    const r = await cli(["search", "x"], { PIPESHUB_BASE_URL: mcp.origin });
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("No PipesHub credential found");
  });

  test("connect-help works with nothing configured", async () => {
    const r = await cli(["auth", "connect-help", "--text"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("The base URL currently visible here is: (unset)");
  });
});

describe("commands against an instance", () => {
  test("search sends the env token and echoes the request id it sent", async () => {
    mcp.reply("pipeshub_search", textReply({ hits: [{ recordId: "r1", webUrl: "https://x/r1", snippet: "s" }] }));

    const r = await cli(["search", "quarterly", "plan", "--limit", "3", "--app", "a1", "--app", "a2"], connected());

    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout) as { requestId: string; query: string; hitCount: number };
    const call = mcp.calls[mcp.calls.length - 1];
    expect(call?.authorization).toBe(`Bearer ${TOKEN}`);
    expect(call?.args).toEqual({ query: "quarterly plan", limit: 3, apps: ["a1", "a2"] });
    expect(out.requestId).toBe(call?.requestId ?? "missing");
    expect(out.query).toBe("quarterly plan");
    expect(out.hitCount).toBe(1);
  });

  test("an ask with no citations exits 6 but still prints the answer", async () => {
    mcp.reply("pipeshub_chat", textReply({ answer: "maybe" }));
    const r = await cli(["ask", "is", "it", "done?", "--mode", "web"], connected());
    expect(r.code).toBe(6);
    expect(JSON.parse(r.stdout)).toMatchObject({ answer: "maybe", cited: false });
    expect(mcp.calls[mcp.calls.length - 1]?.args).toMatchObject({ chatMode: "web_search" });
  });

  test("--text prints get's delimited content instead of JSON", async () => {
    mcp.reply("pipeshub_get_record_content", textReply("record body"));
    const r = await cli(["get", "rec-1", "--text"], connected());
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("<<<PIPESHUB_RETRIEVED_CONTENT\n");
    expect(r.stdout).toContain("\nrecord body\n");
  });

  test("a rejected token is exit 3 with the server's reason on stderr", async () => {
    mcp.reply("pipeshub_sources", { status: 401, body: "token revoked" });
    const r = await cli(["sources"], connected());
    expect(r.code).toBe(3);
    expect(r.stderr).toContain("MCP request failed (HTTP 401");
    expect(r.stdout).toBe("");
  });

  test("a payload larger than the pipe buffer arrives whole", async () => {
    // process.exit() does not flush a piped stdout. Before writes waited for
    // the flush, a 2 MB answer was cut at 1 MB and still exited 0.
    const big = "b".repeat(2_000_000);
    mcp.reply("pipeshub_get_record_content", textReply(big));
    const r = await cli(["get", "rec-big", "--max-chars", "3000000"], connected());
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout) as { content: string; truncated: boolean };
    expect(out.truncated).toBe(false);
    expect(out.content).toContain(big);
  });

  test("a public host over plain HTTP is refused unless --insecure-http is passed", async () => {
    const env = { PIPESHUB_TOKEN: TOKEN, PIPESHUB_BASE_URL: "http://pipeshub.invalid" };
    const r = await cli(["sources"], env);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("pipeshub:");
  });
});

describe("init-qm", () => {
  test("needs a target directory", async () => {
    const r = await cli(["init-qm"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toBe("pipeshub: init-qm requires a target directory\n");
  });

  test("runs with no credential at all and reports what it wrote as JSON", async () => {
    const target = join(home, "deploy-json");
    const r = await cli(["init-qm", target]);
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout) as {
      target: string; written: string[]; skipped: string[]; dockerfile: string;
    };
    expect(out.target).toBe(target);
    expect(out.dockerfile).toBe("created");
    expect(out.written).toContain(join(target, "sandbox", "tools", "pipeshub", "tool.json"));
    expect(out.skipped).toEqual([]);
  });

  test("--text prints the operator report", async () => {
    const target = join(home, "deploy-text");
    const r = await cli(["init-qm", target, "--text"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain(`Scaffolded the PipesHub bundle into ${target}`);
    expect(r.stdout).toContain("Two things left to do:");
  });

  test("the JSON output carries the stale-Dockerfile warning, not just the text report", async () => {
    // JSON is the default output. The report's "ACTION NEEDED" says `qm check`
    // will reject this file; when it was only in --text, the default run said
    // "skipped-unusable" and nothing about the file that will break the deploy.
    const target = join(home, "deploy-stale");
    await mkdir(join(target, "sandbox"), { recursive: true });
    await writeFile(join(target, "qm.config.jsonc"), '{ "sandbox": { "backend": "sprites" } }');
    await writeFile(join(target, "sandbox", "Dockerfile"), "FROM x\n");

    const r = await cli(["init-qm", target]);

    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({
      dockerfile: "skipped-unusable",
      dockerfileSkipReason: "sprites-ignores-image",
      staleDockerfile: true,
    });
  });
});
