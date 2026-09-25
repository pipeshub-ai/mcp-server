import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { usersGetUserById } from "../src/funcs/usersGetUserById.js";
import { HTTPClient } from "../src/lib/http.js";

// `--log-level debug` is what someone turns on when a tool call misbehaves.
// For the stdio server, stdout *is* the MCP connection, so anything else
// written there corrupts it; and the log must never contain the credential
// (AGENTS.md: never print or log a PAT).

const USER_ID = "507f1f77bcf86cd799439011";
const TOKEN = "h." + Buffer.from(JSON.stringify({ userId: USER_ID, exp: 4102444800 })).toString("base64url") + ".s";

let api: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  api = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => Response.json({ _id: USER_ID }, { headers: { "set-cookie": "session=secret-cookie" } }),
  });
});

afterAll(() => {
  api.stop(true);
});

describe("SDK debug logging", () => {
  test("logs the request and response but never the credential", async () => {
    const lines: string[] = [];
    let depth = 0;
    const sdk = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: TOKEN },
      httpClient: new HTTPClient({
        fetcher: async () =>
          Response.json({ _id: USER_ID }, { headers: { "set-cookie": "session=secret-cookie" } }),
      }),
      debugLogger: {
        log: (...args: unknown[]) => void lines.push("  ".repeat(depth) + args.map(String).join(" ")),
        group: (label?: string) => {
          lines.push("  ".repeat(depth) + (label ?? ""));
          depth++;
        },
        groupEnd: () => void depth--,
      },
    });

    await usersGetUserById(sdk, { id: USER_ID });

    const log = lines.join("\n");
    expect(log).toContain(`> Request: GET http://pipeshub.test/api/v1/users/${USER_ID}`);
    expect(log).toContain("< Response: GET");
    expect(log).toContain("authorization: [redacted]");
    expect(log).toContain("set-cookie: [redacted]");
    expect(log).toContain("accept: application/json");
    expect(log).not.toContain(TOKEN);
    expect(log).not.toContain("secret-cookie");
  });
});
