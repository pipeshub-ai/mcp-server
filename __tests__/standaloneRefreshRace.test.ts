import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { storedLogin } from "../src/cli/login.js";
import { startFakeLocal, type FakeLocal } from "./helpers/fakeLocalPipeshub.js";

// An expired access token and several processes (the bridge, `index`, a watcher) refreshing at once. The server rotates refresh
// tokens, so only the first refresh can win; the others must pick up what it wrote, not tell the person to sign in again.

let fake: FakeLocal | null = null;
afterEach(() => { fake?.stop(); fake = null; });

describe("refreshing an expired sign-in from several callers at once", () => {
  test("every caller gets a working token and nobody is told to sign in again", async () => {
    fake = startFakeLocal({ orgExists: true });
    fake.rotate = { delayMs: 150, current: "refresh-0" };
    const home = await mkdtemp(join(tmpdir(), "l9i-race-"));
    try {
      const file = join(home, ".config", "pipeshub", "credentials.json");
      await mkdir(join(home, ".config", "pipeshub"), { recursive: true });
      await writeFile(file, JSON.stringify({
        origin: fake.origin, clientId: "c", tokenEndpoint: `${fake.origin}/api/v1/oauth2/token`,
        accessToken: "old", refreshToken: "refresh-0", expiresAt: Date.now() - 1000,
      }), { mode: 0o600 });
      const env = { HOME: home };
      const results = await Promise.allSettled(Array.from({ length: 6 }, () => storedLogin(fake!.origin, false, env)));
      expect(results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason))).toEqual([]);
      const tokens = new Set(results.map((r) => (r as PromiseFulfilledResult<{ accessToken: string }>).value.accessToken));
      expect(tokens.size).toBe(1); // one refresh, shared
      expect([...tokens][0]).not.toBe("old");
      expect(JSON.parse(await readFile(file, "utf8")).refreshToken).toBe(fake.rotate.current);
      expect(fake.log.filter((l) => l === "POST /api/v1/oauth2/token").length).toBe(1);
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });
});
