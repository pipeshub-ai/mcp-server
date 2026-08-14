import { describe, expect, test } from "bun:test";
import { readJson, readValidated } from "../src/mcp-server/tools/_helpers.js";
import * as z from "zod";

// The SDK funcs are generated with `errorCodes: []`, so the request layer
// hands back a `Response` for a 401 exactly as it does for a 200 and
// `result.ok` stays true. Before the status guard, the tools parsed that body,
// found no results inside it, and reported an empty corpus — a failed
// credential was indistinguishable from a knowledge base with nothing in it.
//
// These fixtures are the real PipesHub error envelope, whose message sits at
// `error.message`; a guard that stringifies `error` naively yields
// "[object Object]" and tells the user nothing.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const unauthorized = {
  error: { code: "HTTP_UNAUTHORIZED", message: "Could not validate credentials" },
};

function textOf(result: { content: Array<{ type: string; text?: string }> }) {
  return result.content.map((c) => c.text ?? "").join("\n");
}

describe("readJson status guard", () => {
  test("a 401 is an error, not an empty result", async () => {
    const parsed = await readJson(jsonResponse(401, unauthorized), "PipesHub search");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.result.isError).toBe(true);
  });

  test("the error names the operation, the status, and the server's reason", async () => {
    const parsed = await readJson(jsonResponse(401, unauthorized), "PipesHub search");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    const text = textOf(parsed.result);
    expect(text).toContain("PipesHub search");
    expect(text).toContain("401");
    expect(text).toContain("Could not validate credentials");
    // The nested envelope must not collapse to "[object Object]".
    expect(text).not.toContain("[object Object]");
  });

  test("401 and 403 point at the credential", async () => {
    for (const status of [401, 403]) {
      const parsed = await readJson(jsonResponse(status, unauthorized));
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(textOf(parsed.result)).toContain("token");
    }
  });

  test("a 200 still parses normally", async () => {
    const parsed = await readJson<{ searchResults: string[] }>(
      jsonResponse(200, { searchResults: ["hit"] }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.searchResults).toEqual(["hit"]);
  });

  test("a 200 whose body genuinely has no results is NOT an error", async () => {
    // The case the guard must not swallow: an empty corpus is a real answer.
    const parsed = await readJson<{ searchResults: string[] }>(
      jsonResponse(200, { searchResults: [] }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.searchResults).toEqual([]);
  });

  test("a 500 is reported rather than parsed", async () => {
    const parsed = await readJson(jsonResponse(500, { message: "boom" }), "Model listing");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(textOf(parsed.result)).toContain("500");
    expect(textOf(parsed.result)).toContain("Model listing");
  });
});

describe("readValidated status guard", () => {
  const schema = z.object({ items: z.array(z.string()) });

  test("a 401 is an error before schema validation runs", async () => {
    const parsed = await readValidated(
      jsonResponse(401, unauthorized),
      schema,
      "Agent list request",
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    const text = textOf(parsed.result);
    expect(text).toContain("401");
    // Must read as an auth failure, not as a malformed payload.
    expect(text).not.toContain("parse");
  });

  test("a valid 200 still validates", async () => {
    const parsed = await readValidated(
      jsonResponse(200, { items: ["a"] }),
      schema,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.items).toEqual(["a"]);
  });
});
