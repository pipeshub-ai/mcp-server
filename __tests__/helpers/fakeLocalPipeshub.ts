// A stand-in for the pieces of a fresh local PipesHub that `pipeshub init`
// and `pipeshub index` talk to: health, first-run account creation, password
// sign-in, personal access tokens, and the local-repos API. Loopback only.

import { createHash, randomBytes } from "node:crypto";

export interface FakeLocal {
  origin: string;
  /** The access token init minted, as the server issued it (so a test can look for it in files). */
  issuedToken: string;
  /** The password init generated for the first account. */
  password: string | null;
  revoked: string[];
  log: string[];
  repo: { name: string | null; files: Map<string, string>; commits: number; deleted: string[] };
  stop(): void;
}

export function startFakeLocal(opts: { orgExists?: boolean } = {}): FakeLocal {
  const issuedToken = "fake-pat-" + randomBytes(12).toString("hex");
  const state: FakeLocal = {
    origin: "",
    issuedToken,
    password: null,
    revoked: [],
    log: [],
    repo: { name: null, files: new Map(), commits: 0, deleted: [] },
    stop: () => server.stop(true),
  };
  let org = opts.orgExists ?? false;
  let email = "";
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const p = url.pathname;
      state.log.push(`${req.method} ${p}`);
      const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
      const body = req.method === "GET" || req.method === "DELETE" ? {} : ((await req.json().catch(() => ({}))) as Record<string, any>);

      if (p === "/api/v1/health") return json({ status: "ok" });
      if (p === "/api/v1/org/exists") return json({ exists: org });
      if (p === "/api/v1/org" && req.method === "POST") {
        if (org) return json({ detail: "exists" }, 400);
        org = true;
        email = body["contactEmail"];
        state.password = body["password"];
        return json({ ok: true }, 201);
      }
      if (p === "/api/v1/userAccount/initAuth") return json({}, 200, { "x-session-token": "sess" });
      if (p === "/api/v1/userAccount/authenticate") {
        const ok = org && body["email"] === email && body["credentials"]?.password === state.password;
        return ok ? json({ accessToken: "session-" + randomBytes(6).toString("hex") }) : json({ detail: "bad" }, 401);
      }
      if (p === "/api/v1/personal-access-tokens/scopes") {
        return json({ scopes: ["semantic:write", "kb:read", "user:read", "connector:read", "code:read", "conversation:chat"].map((name) => ({ name })) });
      }
      if (p === "/api/v1/personal-access-tokens" && req.method === "POST") {
        if (!bearer?.startsWith("session-")) return json({}, 401);
        state.log.push(`scopes ${JSON.stringify(body["scopes"])}`);
        return json({ token: { id: "pat1", accessToken: issuedToken } }, 201);
      }
      if (p.startsWith("/api/v1/personal-access-tokens/") && req.method === "DELETE") {
        state.revoked.push(p.split("/").pop()!);
        return json({ ok: true });
      }

      // local repositories (notes handoffs/L9-C-api.md)
      if (p.startsWith("/api/v1/local-repos")) {
        if (bearer !== issuedToken) return json({ detail: "no" }, 401);
        const rest = p.slice("/api/v1/local-repos".length).split("/").filter(Boolean);
        const limits = { maxFiles: 20000, maxFileBytes: 1048576, maxBatchFiles: 100, maxBatchBytes: 4194304, maxManifestEntries: 20000 };
        if (rest.length === 1 && req.method === "PUT") {
          state.repo.name = body["name"];
          return json({ repoKey: rest[0], name: body["name"], connectorId: "c1", created: true, limits, state: "empty", files: 0, generation: 0 }, 201);
        }
        if (rest[1] === "manifest") {
          const want = (body["files"] as { path: string; sha256: string }[]).filter((f) => {
            const have = state.repo.files.get(f.path);
            return have === undefined || createHash("sha256").update(have).digest("hex") !== f.sha256;
          });
          const keep = new Set((body["files"] as { path: string }[]).map((f) => f.path));
          const gone = body["complete"] ? [...state.repo.files.keys()].filter((k) => !keep.has(k)) : [];
          for (const g of gone) state.repo.files.delete(g);
          state.repo.deleted.push(...gone);
          return json({ upload: want.map((f) => f.path), deleted: gone, unchanged: body["files"].length - want.length, rejected: [] });
        }
        if (rest[1] === "files") {
          for (const f of body["files"] as { path: string; content: string; sha256: string }[]) state.repo.files.set(f.path, f.content);
          return json({ stored: body["files"].map((f: { path: string }) => f.path), rejected: [] });
        }
        if (rest[1] === "commit") {
          state.repo.commits++;
          return json({ state: "syncing" }, 202);
        }
        if (rest.length === 1 && req.method === "GET") {
          return json({ repoKey: rest[0], state: state.repo.commits > 0 ? "ready" : "empty", files: state.repo.files.size, indexing: { total: state.repo.files.size, completed: state.repo.files.size } });
        }
      }
      return json({ detail: "not found" }, 404);
    },
  });
  state.origin = `http://127.0.0.1:${server.port}`;
  return state;
}
