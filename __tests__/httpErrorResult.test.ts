import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  errorResult,
  expiredTokenError,
  httpErrorResult,
  jsonResult,
  readValidated,
} from "../src/mcp-server/tools/_helpers.js";

// What an LLM client is told when PipesHub does not answer. The streaming funcs
// set `errorCodes: []`, so a 401 or a 502 arrives as an ordinary Response and
// this is the only thing standing between it and "stream ended without usable
// frames". None of it was covered.

const res = (
  status: number,
  body = "",
  statusText = "",
): Response => new Response(body, { status, statusText });

const textOf = (r: { content: Array<{ text?: string }> }): string =>
  r.content.map((c) => c.text ?? "").join("");

describe("httpErrorResult", () => {
  test("an ok response is not an error and the body is left unread", async () => {
    const ok = res(200, "still here");
    expect(await httpErrorResult(ok, "Search")).toBeNull();
    // The caller streams this body afterwards, so it must not have been drained.
    expect(await ok.text()).toBe("still here");
  });

  test("names what failed and the status", async () => {
    const out = await httpErrorResult(res(502, "", "Bad Gateway"), "Search");
    expect(out?.isError).toBe(true);
    expect(textOf(out!)).toContain("Search failed (HTTP 502 Bad Gateway)");
  });

  test("lifts the server's message out of an error envelope", async () => {
    for (const body of [
      '{"message":"Invalid token"}',
      '{"error":"Invalid token"}',
      '{"error":{"message":"Invalid token"}}',
      '{"detail":"Invalid token"}',
    ]) {
      expect(textOf((await httpErrorResult(res(400, body), "Search"))!))
        .toContain("Invalid token.");
    }
  });

  test("never renders a nested object as [object Object]", async () => {
    // `error` holding an object is a common envelope; taking it as a string is
    // how a reader gets told their request failed because of "[object Object]".
    const out = textOf((await httpErrorResult(
      res(400, '{"error":{"code":"BAD","fields":["a"]}}'),
      "Search",
    ))!);
    expect(out).not.toContain("[object Object]");
    expect(out).toContain('{"error":{"code":"BAD","fields":["a"]}}');
  });

  test("a non-JSON body is passed through as written", async () => {
    expect(textOf((await httpErrorResult(res(500, "upstream exploded"), "Chat"))!))
      .toContain("upstream exploded.");
  });

  test("punctuates the server's reason so it does not run into the hint", async () => {
    const out = textOf((await httpErrorResult(res(401, '{"message":"Invalid token"}'), "Chat"))!);
    expect(out).toContain("Invalid token. Check that");
  });

  test("does not double up punctuation the server already wrote", async () => {
    const out = textOf((await httpErrorResult(res(401, '{"message":"Invalid token!"}'), "Chat"))!);
    expect(out).toContain("Invalid token!");
    expect(out).not.toContain("Invalid token!.");
  });

  test("adds the credentials hint only where it is the likely cause", async () => {
    for (const status of [401, 403]) {
      expect(textOf((await httpErrorResult(res(status), "Chat"))!))
        .toContain("bearer token");
    }
    for (const status of [404, 429, 500]) {
      expect(textOf((await httpErrorResult(res(status), "Chat"))!))
        .not.toContain("bearer token");
    }
  });

  test("a long body is truncated rather than filling the client's context", async () => {
    const out = textOf((await httpErrorResult(res(500, "x".repeat(5000)), "Chat"))!);
    expect(out.length).toBeLessThan(600);
  });

  test("an empty body still produces a usable message", async () => {
    const out = textOf((await httpErrorResult(res(503, "", "Service Unavailable"), "Chat"))!);
    expect(out).toBe("Chat failed (HTTP 503 Service Unavailable).");
  });
});

describe("readValidated", () => {
  const schema = z.object({ id: z.string() });

  test("returns the typed value on a good response", async () => {
    const out = await readValidated(res(200, '{"id":"r1"}'), schema);
    expect(out).toEqual({ ok: true, value: { id: "r1" } });
  });

  test("a non-2xx never reaches the parser", async () => {
    // Otherwise an HTML error page is reported as a JSON parse failure and the
    // real cause -- the status -- is the one thing missing from the message.
    const out = await readValidated(res(500, "<html>nope</html>"), schema, "Sources");
    expect(out.ok).toBe(false);
    expect(textOf((out as { result: never }).result)).toContain("HTTP 500");
  });

  test("an empty body says so", async () => {
    const out = await readValidated(res(200, ""), schema);
    expect(textOf((out as { ok: false; result: never }).result))
      .toBe("Empty response from server");
  });

  test("unparseable JSON shows what arrived", async () => {
    const out = await readValidated(res(200, "{oops"), schema);
    const text = textOf((out as { ok: false; result: never }).result);
    expect(text).toContain("Failed to parse response as JSON");
    expect(text).toContain("{oops");
  });

  test("a shape that does not match names the field", async () => {
    const out = await readValidated(res(200, '{"id":7}'), schema);
    const text = textOf((out as { ok: false; result: never }).result);
    expect(text).toContain("Unexpected response shape");
    expect(text).toContain("id");
  });
});

describe("expiredTokenError", () => {
  test("says when it expired and where to mint another", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const out = expiredTokenError(exp);
    expect(out?.isError).toBe(true);
    expect(textOf(out!)).toContain(new Date(exp * 1000).toISOString());
    expect(textOf(out!)).toContain("Personal Access Tokens");
  });

  test("a token still in date is not an error", () => {
    expect(expiredTokenError(Math.floor(Date.now() / 1000) + 3600)).toBeNull();
  });

  test("no usable expiry is not an error either", () => {
    // A PAT without `exp` is valid; reporting it as expired would lock out a
    // working credential.
    for (const exp of [undefined, null, "soon", NaN, Infinity]) {
      expect(expiredTokenError(exp)).toBeNull();
    }
  });
});

describe("jsonResult and errorResult", () => {
  test("a result carries one readable text block", () => {
    expect(jsonResult({ a: 1 })).toEqual({
      content: [{ type: "text", text: '{\n  "a": 1\n}' }],
    });
  });

  test("an error result is flagged as one", () => {
    expect(errorResult("nope")).toEqual({
      content: [{ type: "text", text: "nope" }],
      isError: true,
    });
  });
});
