import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const manifest = JSON.parse(readFileSync(join(import.meta.dir, "..", "manifest.json"), "utf8"));

describe("Claude Desktop bundle (manifest.json)", () => {
  // OAuth client fields drove the client_credentials grant, which has no user
  // identity, and a filled-in pair replaced the PAT on every request.
  test("authenticates with a personal access token only", () => {
    const args: string[] = manifest.server.mcp_config.args;
    expect(args).toContain("--bearer-auth");
    for (const flag of ["--client-id", "--client-secret", "--token-url"]) expect(args).not.toContain(flag);
    expect(Object.keys(manifest.user_config).sort()).toEqual(["bearer_auth", "instance_url", "server_index"]);
    expect(manifest.user_config.bearer_auth.required).toBe(true);
  });
});
