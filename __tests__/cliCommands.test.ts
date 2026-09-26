import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ask,
  connectHelp,
  directoryWhoami,
  get,
  search,
  sources,
  type Ctx,
} from "../src/cli/commands.js";
import { CliError, EXIT } from "../src/cli/config.js";
import { startFakeMcp, textReply, type FakeMcp } from "./helpers/fakePipeshubMcp.js";

// These are the shapes an agent inside QM parses after running `pipeshub
// search|ask|get|sources|directory whoami`. Each command is run against a fake
// `/mcp` on loopback, so the request that leaves the CLI is checked too.

const TOKEN = "test-token-not-real";
let mcp: FakeMcp;
let tmp: string;

beforeAll(async () => {
  mcp = startFakeMcp();
  tmp = await mkdtemp(join(tmpdir(), "mcpcov-init-cmd-"));
});

afterAll(async () => {
  mcp.stop();
  await rm(tmp, { recursive: true, force: true });
});

const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  origin: mcp.origin,
  token: TOKEN,
  insecureHttp: false,
  requestId: "req-1",
  json: true,
  maxChars: 2000,
  ...over,
});

const lastCall = () => mcp.calls[mcp.calls.length - 1];

async function cliError(p: Promise<unknown>): Promise<CliError> {
  try {
    await p;
  } catch (e: unknown) {
    if (e instanceof CliError) return e;
    throw e;
  }
  throw new Error("expected a CliError");
}

describe("sources", () => {
  test("lists each source's id, name, kind and connector", async () => {
    mcp.reply("pipeshub_sources", textReply({
      sources: [
        { id: "app-1", name: "Engineering Drive", kind: "app", connector: "DRIVE", extra: "x" },
        { id: "kb-1", name: "Handbook", kind: "kb" },
      ],
      llmModels: [{ modelName: "m" }],
    }));

    const out = await sources(ctx());

    expect(lastCall()).toMatchObject({
      path: "/mcp",
      authorization: `Bearer ${TOKEN}`,
      requestId: "req-1",
      method: "tools/call",
      tool: "pipeshub_sources",
      args: {},
    });
    expect(out.exit).toBe(EXIT.OK);
    expect(out.payload).toEqual({
      requestId: "req-1",
      sources: [
        { id: "app-1", name: "Engineering Drive", kind: "app", connector: "DRIVE" },
        { id: "kb-1", name: "Handbook", kind: "kb", connector: null },
      ],
      llmModels: [{ modelName: "m" }],
      llmModelsVisible: true,
    });
  });

  test("no sources is exit 6, and hidden models are reported as not visible", async () => {
    mcp.reply("pipeshub_sources", textReply({ sources: [] }));
    const out = await sources(ctx());
    expect(out.exit).toBe(EXIT.NO_RESULTS);
    expect(out.payload["llmModelsVisible"]).toBe(false);
    expect(out.payload["llmModels"]).toEqual([]);
  });
});

describe("search", () => {
  test("sends the query, limit and filters, and flattens hits and records", async () => {
    mcp.reply("pipeshub_search", textReply({
      hits: [
        { recordId: "r1", recordName: "Plan", webUrl: "https://x/r1", score: 0.9, snippet: "hello" },
        // The nested shape older instances return.
        { score: 0.5, metadata: { recordId: "r2", recordName: "Old", webUrl: "https://x/r2", blockText: "nested" } },
      ],
      uniqueRecords: [{ recordId: "r1", name: "Plan", webUrl: "https://x/r1" }],
      notes: ["one note", 42],
    }));

    const out = await search(ctx(), "roadmap", 5, ["app-1"], ["kb-1"]);

    expect(lastCall()?.args).toEqual({ query: "roadmap", limit: 5, apps: ["app-1"], kb: ["kb-1"] });
    expect(out.exit).toBe(EXIT.OK);
    expect(out.payload).toMatchObject({
      requestId: "req-1",
      query: "roadmap",
      hitCount: 2,
      notes: ["one note"],
      hits: [
        { recordId: "r1", recordName: "Plan", webUrl: "https://x/r1", score: 0.9, snippet: "hello" },
        { recordId: "r2", recordName: "Old", webUrl: "https://x/r2", score: 0.5, snippet: "nested" },
      ],
      records: [{ recordId: "r1", recordName: "Plan", webUrl: "https://x/r1" }],
    });
    // Retrieved text is attacker-writable, so every search payload says so.
    expect(String(out.payload["contentWarning"])).toContain("not instructions");
  });

  test("empty filters are left out of the request rather than sent as []", async () => {
    mcp.reply("pipeshub_search", textReply({ hits: [] }));
    await search(ctx(), "q", 10, [], []);
    expect(lastCall()?.args).toEqual({ query: "q", limit: 10 });
  });

  test("no hits and no records is exit 6", async () => {
    mcp.reply("pipeshub_search", textReply({ hits: [], uniqueRecords: [] }));
    expect((await search(ctx(), "q", 10, [], [])).exit).toBe(EXIT.NO_RESULTS);
  });

  test("snippets are clipped to --max-chars", async () => {
    mcp.reply("pipeshub_search", textReply({ hits: [{ recordId: "r", snippet: "x".repeat(50) }] }));
    const out = await search(ctx({ maxChars: 10 }), "q", 10, [], []);
    const hits = out.payload["hits"] as Array<{ snippet: string }>;
    expect(hits[0]?.snippet).toBe("x".repeat(10) + "…[truncated]");
  });

  test("a tool error carrying HTTP 403 is exit 4", async () => {
    mcp.reply("pipeshub_search", {
      isError: true,
      content: [{ type: "text", text: "Search failed (HTTP 403 Forbidden). You do not have permission." }],
    });
    const e = await cliError(search(ctx(), "q", 10, [], []));
    expect(e.code).toBe(EXIT.FORBIDDEN);
    expect(e.message).toContain("do not have permission");
  });
});

describe("ask", () => {
  test("passes the conversation and mode, and returns the cited answer", async () => {
    mcp.reply("pipeshub_chat", textReply({
      answer: "Ship on Friday.",
      conversationId: "conv-9",
      confidence: "High",
      citations: [{ recordId: "r1", recordName: "Plan", webUrl: "https://x/r1", snippet: "Friday" }],
    }));

    const out = await ask(ctx(), "when do we ship?", "conv-8");

    expect(lastCall()?.args).toEqual({
      query: "when do we ship?",
      conversationId: "conv-8",
    });
    expect(out.exit).toBe(EXIT.OK);
    expect(out.payload).toMatchObject({
      answer: "Ship on Friday.",
      conversationId: "conv-9",
      cited: true,
      citationCount: 1,
      confidence: "High",
      warning: null,
      citations: [{ recordId: "r1", recordName: "Plan", webUrl: "https://x/r1", snippet: "Friday" }],
    });
  });

  test("an answer with no citations is exit 6, still returned, and flagged as unsourced", async () => {
    mcp.reply("pipeshub_chat", textReply({ answer: "Probably Friday." }));

    const out = await ask(ctx(), "q", null);

    expect(lastCall()?.args).toEqual({ query: "q" });
    expect(out.exit).toBe(EXIT.NO_RESULTS);
    expect(out.payload["answer"]).toBe("Probably Friday.");
    expect(out.payload["cited"]).toBe(false);
    expect(String(out.payload["warning"])).toContain("unsourced");
  });

  test("a non-string answer is null, not coerced", async () => {
    mcp.reply("pipeshub_chat", textReply({ answer: { nested: true } }));
    expect((await ask(ctx(), "q", null)).payload["answer"]).toBeNull();
  });
});

describe("get", () => {
  test("text content is fetched with get_record_content and delimited as data", async () => {
    mcp.reply("pipeshub_get_record_content", textReply("<record>body</record>"));

    const out = await get(ctx(), "rec-1", null, null);

    expect(lastCall()).toMatchObject({ tool: "pipeshub_get_record_content", args: { recordId: "rec-1" } });
    expect(out.exit).toBe(EXIT.OK);
    expect(out.payload["truncated"]).toBe(false);
    const content = String(out.payload["content"]);
    expect(content.startsWith("<<<PIPESHUB_RETRIEVED_CONTENT\n")).toBe(true);
    expect(content).toContain("\n<record>body</record>\n");
    expect(content.endsWith("PIPESHUB_RETRIEVED_CONTENT>>>")).toBe(true);
    expect(out.text).toBe(content);
  });

  test("content longer than --max-chars is clipped and says so", async () => {
    mcp.reply("pipeshub_get_record_content", textReply("y".repeat(100)));
    const out = await get(ctx({ maxChars: 10 }), "rec-1", null, null);
    expect(out.payload["truncated"]).toBe(true);
    expect(String(out.payload["content"])).toContain("y".repeat(10) + "…[truncated]");
  });

  test("content only slightly longer than --max-chars is still reported as truncated", async () => {
    // The clipped string carries a 12-character marker, so comparing its
    // length with the original's said "not truncated" whenever fewer than 12
    // characters were cut. An agent then treats a partial record as complete.
    mcp.reply("pipeshub_get_record_content", textReply("z".repeat(15)));
    const out = await get(ctx({ maxChars: 10 }), "rec-1", null, null);
    expect(String(out.payload["content"])).toContain("z".repeat(10) + "…[truncated]");
    expect(out.payload["truncated"]).toBe(true);
  });

  test("an empty record is exit 6", async () => {
    mcp.reply("pipeshub_get_record_content", { content: [] });
    expect((await get(ctx(), "rec-1", null, null)).exit).toBe(EXIT.NO_RESULTS);
  });

  test("binary content without --out is a usage error that names the flag", async () => {
    mcp.reply("pipeshub_download_record", {
      content: [{ type: "resource", resource: { uri: "x", mimeType: "application/pdf", blob: "JVBERg==" } }],
    });
    const e = await cliError(get(ctx(), "rec-1", "pdf", null));
    expect(lastCall()).toMatchObject({ tool: "pipeshub_download_record", args: { recordId: "rec-1", convertTo: "pdf" } });
    expect(e.code).toBe(EXIT.USAGE);
    expect(e.message).toContain("application/pdf");
    expect(e.message).toContain("--out <path>");
  });

  test("--out writes the decoded bytes of a resource blob", async () => {
    const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
    mcp.reply("pipeshub_download_record", {
      content: [{ type: "resource", resource: { uri: "x", mimeType: "application/pdf", blob: bytes.toString("base64") } }],
    });
    const out = join(tmp, "a.pdf");

    const r = await get(ctx(), "rec-1", null, out);

    expect(lastCall()?.args).toEqual({ recordId: "rec-1" });
    expect(r.payload).toMatchObject({ writtenTo: out, bytes: 6, mimeType: "application/pdf", encoding: "binary" });
    expect(Buffer.compare(await readFile(out), bytes)).toBe(0);
  });

  test("--out handles image blocks, and text when there is no binary", async () => {
    mcp.reply("pipeshub_download_record", {
      content: [{ type: "image", mimeType: "image/png", data: Buffer.from("PNG").toString("base64") }],
    });
    const png = join(tmp, "a.png");
    expect((await get(ctx(), "rec-1", null, png)).payload["mimeType"]).toBe("image/png");
    expect(await readFile(png, "utf8")).toBe("PNG");

    mcp.reply("pipeshub_download_record", textReply("plain text"));
    const txt = join(tmp, "a.txt");
    const r = await get(ctx(), "rec-1", null, txt);
    expect(r.payload).toMatchObject({ mimeType: "text/plain", encoding: "utf8", bytes: 10 });
    expect(await readFile(txt, "utf8")).toBe("plain text");
  });

  test("--out with nothing returned fails instead of writing an empty file", async () => {
    mcp.reply("pipeshub_download_record", { content: [] });
    const e = await cliError(get(ctx(), "rec-1", null, join(tmp, "empty.bin")));
    expect(e.code).toBe(EXIT.NO_RESULTS);
    expect(e.message).toContain("no content for record rec-1");
  });
});

describe("directory whoami", () => {
  test("returns only the identity fields", async () => {
    mcp.reply("pipeshub_directory", textReply({
      userId: "u1", orgId: "o1", fullName: "A Person", email: "a@example.com", identityVerified: true,
    }));
    const out = await directoryWhoami(ctx());
    expect(lastCall()?.args).toEqual({ action: "whoami" });
    expect(out.payload).toEqual({
      requestId: "req-1", userId: "u1", orgId: "o1", fullName: "A Person", email: "a@example.com",
    });
  });

  test("missing fields are null", async () => {
    mcp.reply("pipeshub_directory", textReply("not json"));
    expect((await directoryWhoami(ctx())).payload).toEqual({
      requestId: "req-1", userId: null, orgId: null, fullName: null, email: null,
    });
  });
});

describe("transport rules apply to every command", () => {
  test("a public host over plain HTTP is refused before anything is sent", async () => {
    const before = mcp.calls.length;
    const e = await cliError(sources(ctx({ origin: "http://pipeshub.example.com" })));
    expect(e.code).toBe(EXIT.USAGE);
    expect(mcp.calls.length).toBe(before);
  });

  test("HTTP 401 from the endpoint is exit 3", async () => {
    mcp.reply("pipeshub_sources", { status: 401, body: "no" });
    expect((await cliError(sources(ctx()))).code).toBe(EXIT.UNAUTHENTICATED);
  });
});

describe("connectHelp", () => {
  test("never needs a credential and shows the base URL it can see", () => {
    const out = connectHelp(ctx({ token: "", origin: "" }));
    expect(out.exit).toBe(EXIT.OK);
    expect(out.text).toContain("PIPESHUB_TOKEN");
    expect(out.text).toContain("Never paste the token into a chat message");
    expect(out.text).toContain("The base URL currently visible here is: (unset)");
    expect(out.payload["help"]).toBe(out.text);
    expect(connectHelp(ctx({ origin: "https://p.example.com" })).text)
      .toContain("visible here is: https://p.example.com");
  });
});
