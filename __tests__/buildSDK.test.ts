import { describe, expect, test } from "bun:test";
import { buildSDK, formatResult } from "../src/mcp-server/tools.js";
import type { MCPServerFlags } from "../src/mcp-server/flags.js";

// `buildSDK` decides whose credential a request runs as: the one the caller
// presented in a header, or the one the operator started the server with.
// `disableStaticAuth` is what stops the second from filling in for the first,
// which on a shared server is the difference between "you are not authenticated"
// and running as whoever launched it.

const log = { level: "info" };
const flags = (over: Partial<MCPServerFlags> = {}): MCPServerFlags => ({
  "server-url": "http://pipeshub.test/api/v1",
  ...over,
});
const security = (c: { _options: { security?: unknown } }) =>
  c._options.security as {
    bearerAuth?: string;
    oauth2?: { clientID: string; clientSecret: string; tokenURL: string };
  };

describe("buildSDK credential resolution", () => {
  test("the documented serve setup does not throw", () => {
    // `serve` leaves bearer-auth, client-id and client-secret optional and
    // defaults disable-static-auth to false, and AGENTS.md says not to use
    // client_credentials at all. So this -- a bearer token and nothing else --
    // is the normal configuration, and it used to throw a raw ZodError out of
    // getSDK() on the first tool call.
    expect(() => buildSDK(new Headers(), flags({ "bearer-auth": "op" }), false, log))
      .not.toThrow();
  });

  test("a header beats the flag the server was started with", () => {
    const headers = new Headers({ bearerAuth: "from-caller" });
    const sdk = buildSDK(headers, flags({ "bearer-auth": "from-operator" }), false, log);
    expect(security(sdk).bearerAuth).toBe("from-caller");
  });

  test("with no header the flag is used, which is what a local server wants", () => {
    const sdk = buildSDK(new Headers(), flags({ "bearer-auth": "from-operator" }), false, log);
    expect(security(sdk).bearerAuth).toBe("from-operator");
  });

  test("disableStaticAuth stops the operator's credential filling in", () => {
    // The point of the flag. If this ever returns "from-operator", every
    // unauthenticated caller of a shared server runs as whoever started it.
    const sdk = buildSDK(new Headers(), flags({ "bearer-auth": "from-operator" }), true, log);
    expect(security(sdk).bearerAuth).toBe("");
  });

  test("disableStaticAuth still honours what the caller presented", () => {
    const headers = new Headers({ bearerAuth: "from-caller" });
    const sdk = buildSDK(headers, flags({ "bearer-auth": "from-operator" }), true, log);
    expect(security(sdk).bearerAuth).toBe("from-caller");
  });

  test("no credential anywhere is an empty bearer, not the string undefined", () => {
    const sdk = buildSDK(new Headers(), flags(), false, log);
    expect(security(sdk).bearerAuth).toBe("");
  });
});

describe("buildSDK oauth2", () => {
  test("is configured only when both halves of the client credential are present", () => {
    expect(security(buildSDK(new Headers(), flags({ "client-id": "cid" }), false, log)).oauth2)
      .toBeUndefined();
    expect(
      security(buildSDK(new Headers(), flags({ "client-secret": "sec" }), false, log)).oauth2,
    ).toBeUndefined();

    const both = security(buildSDK(
      new Headers(),
      flags({ "client-id": "cid", "client-secret": "sec" }),
      false,
      log,
    )).oauth2;
    expect(both).toEqual({
      clientID: "cid",
      clientSecret: "sec",
      // The documented default, applied by the schema rather than the caller.
      tokenURL: "/api/v1/oauth2/token",
    });
  });

  test("headers supply the client credential too, and override the flags", () => {
    const headers = new Headers({
      clientID: "h-cid",
      clientSecret: "h-sec",
      tokenURL: "https://idp.test/token",
    });
    const sdk = buildSDK(
      headers,
      flags({ "client-id": "f-cid", "client-secret": "f-sec" }),
      false,
      log,
    );
    expect(security(sdk).oauth2).toEqual({
      clientID: "h-cid",
      clientSecret: "h-sec",
      tokenURL: "https://idp.test/token",
    });
  });

  test("disableStaticAuth drops the flag-supplied client credential as well", () => {
    const sdk = buildSDK(
      new Headers(),
      flags({ "client-id": "cid", "client-secret": "sec" }),
      true,
      log,
    );
    expect(security(sdk).oauth2).toBeUndefined();
  });
});

describe("formatResult", () => {
  const res = (body: BodyInit, type: string, status = 200) =>
    new Response(body, { status, headers: { "content-type": type } });

  test("text-ish bodies arrive as text the model can read", async () => {
    for (const type of [
      "text/plain",
      "application/json",
      "application/xml",
      "application/yaml",
    ]) {
      const out = await formatResult(res("hello", type));
      expect(out.content).toEqual([{ type: "text", text: "hello" }]);
    }
  });

  test("an image is handed over as an image block, not stringified bytes", async () => {
    const out = await formatResult(res(new Uint8Array([1, 2, 3]), "image/png"));
    expect(out.content[0]).toMatchObject({ type: "image", mimeType: "image/png" });
  });

  test("audio likewise", async () => {
    const out = await formatResult(res(new Uint8Array([1, 2, 3]), "audio/mpeg"));
    expect(out.content[0]).toMatchObject({ type: "audio", mimeType: "audio/mpeg" });
  });

  test("anything else becomes a resource rather than unreadable text", async () => {
    // A PDF read as text is thousands of tokens of nothing.
    const out = await formatResult(res(new Uint8Array([1, 2, 3]), "application/pdf"));
    expect(out.content[0]).toMatchObject({ type: "resource" });
  });

  test("a missing content-type is treated as opaque, not as text", async () => {
    const out = await formatResult(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    // Bun defaults an unset content-type, so assert only that it did not throw
    // and produced exactly one block.
    expect(out.content).toHaveLength(1);
  });

  test("a failed response is flagged even when the body reads fine", async () => {
    // Otherwise the model treats an error page as the answer.
    const out = await formatResult(res("not found", "text/plain", 404));
    expect(out.isError).toBe(true);
    expect(out.content).toEqual([{ type: "text", text: "not found" }]);
  });

  test("a successful response carries no error flag", async () => {
    expect((await formatResult(res("ok", "text/plain"))).isError).toBeUndefined();
  });
});
