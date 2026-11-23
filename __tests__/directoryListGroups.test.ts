import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubDirectory } from "../src/mcp-server/tools/pipeshubDirectory.js";

// GET /userGroups is admin-only, and pipeshub_directory is offered without
// usergroup:read, so a member reaches list_groups and must be told why it
// is refused rather than sent to mint a token that would be refused too.

function client(status: number, body: unknown) {
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: { bearerAuth: "token" },
    httpClient: new HTTPClient({ fetcher: async () => Response.json(body, { status }) }),
  });
}

const run = (c: PipeshubCore) =>
  tool$pipeshubDirectory.tool(
    c,
    { action: "list_groups" } as never,
    { signal: new AbortController().signal } as never,
  );

const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");

describe("pipeshub_directory list_groups", () => {
  for (const [why, message] of [
    ["the token lacks usergroup:read", "Insufficient scope. Required: usergroup:read"],
    ["the caller is not an admin", "Admin access required"],
  ] as const) {
    test(`a 403 because ${why} says only org admins can list groups`, async () => {
      const out = await run(client(403, { error: { message } }));
      expect(out.isError).toBe(true);
      expect(textOf(out)).toContain("Only PipesHub org admins can list groups");
      expect(textOf(out)).toContain("list_my_teams");
      expect(textOf(out)).not.toContain("personal access token");
    });
  }

  test("an admin gets the groups", async () => {
    const out = await run(client(200, { groups: [{ name: "Eng", userCount: 3 }] }));
    expect(out.isError).toBeUndefined();
    expect(JSON.parse(textOf(out))).toEqual({ groups: [{ name: "Eng", userCount: 3 }] });
  });
});
