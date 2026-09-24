import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PipeshubCore } from "../src/core.js";
import { createConsoleLogger } from "../src/mcp-server/console-logger.js";
import {
  createRegisterResource,
  formatResult,
  type ResourceDefinition,
} from "../src/mcp-server/resources.js";
import type { MCPScope } from "../src/mcp-server/scopes.js";
import {
  consumeStream,
  isAsyncIterable,
  isBinaryData,
  valueToBase64,
} from "../src/mcp-server/shared.js";

// `valueToBase64` is how binary tool and resource results (images, audio,
// downloads) are put on the wire. Each input shape takes a different branch,
// and the string branch is a validator, not an encoder.

const bytes = new Uint8Array([0, 1, 2, 250, 255]);
const b64 = Buffer.from(bytes).toString("base64");

const streamOf = (...chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const chunk of chunks) c.enqueue(chunk);
      c.close();
    },
  });

describe("valueToBase64", () => {
  test("encodes every binary shape to the same base64", async () => {
    const shapes: unknown[] = [
      bytes,
      bytes.slice().buffer,
      new Blob([bytes]),
      new Response(bytes),
      streamOf(bytes.slice(0, 2), bytes.slice(2)),
    ];
    for (const shape of shapes) {
      expect(await valueToBase64(shape as Uint8Array)).toBe(b64);
    }
  });

  test("passes a base64 string through, and rejects one that is not base64", async () => {
    expect(await valueToBase64(b64)).toBe(b64);
    await expect(valueToBase64("not base64!")).rejects.toThrow();
  });

  test("null and undefined are null, not an empty payload", async () => {
    expect(await valueToBase64(null)).toBeNull();
    expect(await valueToBase64(undefined)).toBeNull();
  });
});

describe("stream and type helpers", () => {
  test("consumeStream joins every chunk in order", async () => {
    const out = await consumeStream(streamOf(new Uint8Array([1]), new Uint8Array([2, 3])));
    expect([...out]).toEqual([1, 2, 3]);
  });

  test("isBinaryData and isAsyncIterable recognise their shapes", () => {
    expect([bytes, new Blob([]), "s", new Response("")].every(isBinaryData)).toBe(true);
    expect([1, {}, null, undefined].some(isBinaryData)).toBe(false);

    async function* gen() {
      yield "x";
    }
    expect(isAsyncIterable(gen())).toBe(true);
    expect(isAsyncIterable("x")).toBe(false);
    expect(isAsyncIterable(null)).toBe(false);
  });
});

describe("resources", () => {
  // No resources are registered by createMCPServer today; these pin the
  // registration contract so adding one behaves like tools do.
  const logger = createConsoleLogger("error");
  const sdk = new PipeshubCore({ serverURL: "http://pipeshub.test/api/v1" });

  const def = (name: string, scopes?: string[]): ResourceDefinition => ({
    name,
    description: `the ${name} resource`,
    resource: `pipeshub://${name}`,
    ...(scopes ? { scopes: scopes as MCPScope[] } : {}),
    read: (client, uri) => {
      expect(client).toBe(sdk);
      return { contents: [{ uri: uri.toString(), text: `read ${name}` }] };
    },
  });

  async function serve(allowed: string[]) {
    const server = new McpServer({ name: "t", version: "0" });
    const register = createRegisterResource(logger, server, () => sdk, new Set(allowed as MCPScope[]));
    register(def("unscoped"));
    register(def("readable", ["read"]));
    register(def("writable", ["read", "write"]));
    const [c, s] = InMemoryTransport.createLinkedPair();
    await server.connect(s);
    const client = new Client({ name: "test", version: "0" });
    await client.connect(c);
    return client;
  }

  test("scope filtering matches the tool rules", async () => {
    const all = await serve([]);
    expect((await all.listResources()).resources.map((r) => r.name))
      .toEqual(["unscoped", "readable", "writable"]);

    const readOnly = await serve(["read"]);
    expect((await readOnly.listResources()).resources.map((r) => r.name)).toEqual(["readable"]);
  });

  test("reading a resource calls its reader with the client and uri", async () => {
    const client = await serve([]);
    const res = await client.readResource({ uri: "pipeshub://readable" });
    expect(res.contents).toEqual([{ uri: "pipeshub://readable", text: "read readable" }]);
    const listed = (await client.listResources()).resources.find((r) => r.name === "readable");
    expect(listed?.description).toBe("the readable resource");
  });

  test("formatResult sends images as base64 blobs and everything else as text", async () => {
    const uri = new URL("pipeshub://thing");

    const img = await formatResult(
      new Response(bytes, { headers: { "content-type": "image/png" } }),
      uri,
    );
    expect(img.contents).toEqual([{ uri: "pipeshub://thing", blob: b64, mimeType: "image/png" }]);

    const txt = await formatResult(
      new Response("hello", { headers: { "content-type": "application/json" } }),
      uri,
    );
    expect(txt.contents).toEqual([{ uri: "pipeshub://thing", mimeType: "application/json", text: "hello" }]);

    const overridden = await formatResult(new Response(bytes), uri, { mimeType: "audio/mpeg" });
    expect(overridden.contents[0]).toMatchObject({ blob: b64, mimeType: "audio/mpeg" });
  });
});
