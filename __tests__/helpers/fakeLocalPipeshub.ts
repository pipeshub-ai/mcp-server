// A stand-in for the pieces of a fresh local PipesHub that `pipeshub init`,
// `pipeshub index` and the bridge talk to: health, first-run account creation,
// password sign-in, the device-code login (discovery, device_authorization,
// consent, token, revoke), /mcp, and the local-repos API. Loopback only.

import { createHash, randomBytes } from "node:crypto";

export interface FakeLocal {
  origin: string;
  /** The access token last minted, as the server issued it (so a test can look for it in files). */
  issuedToken: string;
  /** How many access tokens the device login has issued. */
  mints: number;
  /** The password init generated for the first account. */
  password: string | null;
  revoked: string[];
  log: string[];
  /** What `/mcp` lists, and every tools/call it received. */
  mcp: { tools: Record<string, unknown>[]; calls: { name: string; args: unknown; authorization: string | null }[]; status: number; hang: boolean; reply: ((tool: string) => string | null) | null };
  repo: { name: string | null; files: Map<string, string>; commits: number; deleted: string[]; status: string | null; error: string | null; maxManifestEntries: number; getDelayMs: number; refuse: string[] };
  stop(): void;
}

export function startFakeLocal(opts: { orgExists?: boolean; deviceExpiresIn?: number } = {}): FakeLocal {
  const fresh = () => "fake-pat-" + randomBytes(12).toString("hex");
  const state: FakeLocal = {
    origin: "",
    issuedToken: fresh(),
    mints: 0,
    password: null,
    revoked: [],
    log: [],
    mcp: { tools: [], calls: [], status: 200, hang: false, reply: null },
    repo: { name: null, files: new Map(), commits: 0, deleted: [], status: null, error: null, maxManifestEntries: 20000, getDelayMs: 0, refuse: [] },
    stop: () => server.stop(true),
  };
  let org = opts.orgExists ?? false;
  let codes = 0;
  const approved = new Set<string>();
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
      const isForm = (req.headers.get("content-type") ?? "").includes("x-www-form-urlencoded");
      const body: Record<string, any> = req.method === "GET" || req.method === "DELETE"
        ? {}
        : isForm ? Object.fromEntries(new URLSearchParams(await req.text())) : ((await req.json().catch(() => ({}))) as Record<string, any>);

      if (p === "/mcp") {
        if (state.mcp.hang) return new Promise<Response>(() => undefined);
        if (state.mcp.status !== 200) return new Response("", { status: state.mcp.status });
        const rpc = body as { id?: number; method: string; params?: { name?: string; arguments?: unknown } };
        let result: unknown = {};
        if (rpc.method === "tools/list") result = { tools: state.mcp.tools };
        if (rpc.method === "tools/call") {
          state.mcp.calls.push({ name: rpc.params!.name!, args: rpc.params!.arguments, authorization: req.headers.get("authorization") });
          const canned = state.mcp.reply?.(rpc.params!.name!) ?? null;
          result = canned !== null ? { content: [{ type: "text", text: canned }] } : rpc.params!.name === "pipeshub_broken"
            ? { isError: true, content: [{ type: "text", text: "Search failed (HTTP 403 Forbidden)." }] }
            : { content: [{ type: "text", text: JSON.stringify({ tool: rpc.params!.name, args: rpc.params!.arguments }) }] };
        }
        return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result })}\n\n`, { headers: { "content-type": "text/event-stream" } });
      }
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
      if (p === "/.well-known/openid-configuration") {
        return json({
          device_authorization_endpoint: `${state.origin}/api/v1/oauth2/device_authorization`,
          token_endpoint: `${state.origin}/api/v1/oauth2/token`,
          revocation_endpoint: `${state.origin}/api/v1/oauth2/revoke`,
          ...(org ? { pipeshub_device_client_id: "pipeshub-agent" } : {}),
        });
      }
      if (p === "/api/v1/oauth2/device_authorization") {
        if (!org) return json({ error: "server_error" }, 400);
        const n = String(++codes);
        return json({
          device_code: "dev-" + n, user_code: "CODE-" + n, verification_uri: `${state.origin}/device`,
          verification_uri_complete: `${state.origin}/device?user_code=CODE-${n}`, interval: 0.05, expires_in: opts.deviceExpiresIn ?? 600,
        });
      }
      if (p === "/api/v1/oauth2/device/consent") {
        if (!bearer?.startsWith("session-")) return json({}, 401);
        if (body["consent"] === "granted") approved.add(body["user_code"]);
        return json({ ok: true, consent: body["consent"] });
      }
      if (p === "/api/v1/oauth2/token") {
        if (body["grant_type"] === "refresh_token") {
          state.issuedToken = fresh();
          return json({ access_token: state.issuedToken, refresh_token: "refresh-" + ++state.mints, expires_in: 3600 });
        }
        if (!approved.has("CODE-" + String(body["device_code"]).replace("dev-", ""))) return json({ error: "authorization_pending" }, 400);
        if (state.mints++ > 0) state.issuedToken = fresh();
        return json({ access_token: state.issuedToken, refresh_token: "refresh-" + state.mints, expires_in: 3600 });
      }
      if (p === "/api/v1/oauth2/revoke") {
        state.revoked.push(body["token"]);
        return json({});
      }

      // local repositories (notes handoffs/L9-C-api.md)
      if (p.startsWith("/api/v1/local-repos")) {
        if (bearer !== state.issuedToken) return json({ detail: "no" }, 401);
        const rest = p.slice("/api/v1/local-repos".length).split("/").filter(Boolean);
        const limits = { maxFiles: 20000, maxFileBytes: 1048576, maxBatchFiles: 100, maxBatchBytes: 4194304, maxManifestEntries: state.repo.maxManifestEntries };
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
          const bad: { path: string; reason: string }[] = [];
          for (const f of body["files"] as { path: string; content: string; sha256: string }[]) {
            if (state.repo.refuse.includes(f.path) || createHash("sha256").update(f.content).digest("hex") !== f.sha256) { bad.push({ path: f.path, reason: "hash_mismatch" }); continue; }
            state.repo.files.set(f.path, f.content);
          }
          return json({ stored: body["files"].map((f: { path: string }) => f.path).filter((p: string) => !bad.some((b) => b.path === p)), rejected: bad });
        }
        if (rest[1] === "commit") {
          state.repo.commits++;
          return json({ state: "syncing" }, 202);
        }
        if (rest.length === 1 && req.method === "GET") {
          if (state.repo.getDelayMs) await new Promise((r) => setTimeout(r, state.repo.getDelayMs));
          return json({ repoKey: rest[0], state: state.repo.status ?? (state.repo.commits > 0 ? "ready" : "empty"), ...(state.repo.error ? { error: state.repo.error } : {}), files: state.repo.files.size, indexing: { total: state.repo.files.size, completed: state.repo.files.size } });
        }
      }
      return json({ detail: "not found" }, 404);
    },
  });
  state.origin = `http://127.0.0.1:${server.port}`;
  return state;
}
