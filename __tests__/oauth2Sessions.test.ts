import { afterEach, describe, expect, test } from "bun:test";
import { setSystemTime } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { agentsListAgents } from "../src/funcs/agentsListAgents.js";
import { usersGetUserById } from "../src/funcs/usersGetUserById.js";
import { ClientCredentialsHook } from "../src/hooks/clientcredentials.js";
import { HTTPClient } from "../src/lib/http.js";
import { OAuth2SessionStore } from "../src/lib/oauth2-sessions.js";
import type { Security } from "../src/models/security.js";

// When the server is started with a client id and secret, every API call is
// authorised by a token the SDK fetches for itself and caches in
// OAuth2SessionStore. Getting the cache wrong in one direction sends a dead
// token; in the other, it hands one client's token to another. None of it was
// exercised: the store sat at 8% of lines.

const T0 = Date.parse("2026-01-01T00:00:00Z");

afterEach(() => setSystemTime());

describe("OAuth2SessionStore", () => {
  const session = (token: string, scopes: string[], expiresAt?: number) => ({
    token,
    scopes,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  });

  test("returns the session stored for the same owner and scopes, in any order", () => {
    const store = new OAuth2SessionStore();
    store.storeSession("owner", ["b", "a"], session("t1", ["b", "a"]));

    expect(store.getSession("owner", ["a", "b"])?.token).toBe("t1");
  });

  test("never returns one owner's token to another", () => {
    const store = new OAuth2SessionStore();
    store.storeSession("alice", ["read"], session("alice-token", ["read"]));

    expect(store.getSession("bob", ["read"])).toBeUndefined();
  });

  test("a token granted wider scopes serves a narrower request", () => {
    const store = new OAuth2SessionStore();
    store.storeSession("o", ["kb:read", "connector:read"], session("wide", ["kb:read", "connector:read"]));

    expect(store.getSession("o", ["connector:read"])?.token).toBe("wide");
  });

  test("a token missing any required scope is not used", () => {
    const store = new OAuth2SessionStore();
    store.storeSession("o", ["kb:read"], session("narrow", ["kb:read"]));

    expect(store.getSession("o", ["kb:read", "connector:read"])).toBeUndefined();
  });

  test("a token is treated as expired 60 seconds before it actually expires", () => {
    // The margin means a token is not sent when it would lapse in flight.
    setSystemTime(T0);
    const store = new OAuth2SessionStore();
    store.storeSession("o", ["s"], session("t", ["s"], T0 + 120_000));

    setSystemTime(T0 + 59_999);
    expect(store.getSession("o", ["s"])?.token).toBe("t");

    setSystemTime(T0 + 60_000);
    expect(store.getSession("o", ["s"])).toBeUndefined();
  });

  test("an expired exact match falls through to a live wider token", () => {
    setSystemTime(T0);
    const store = new OAuth2SessionStore();
    store.storeSession("o", ["s"], session("stale", ["s"], T0 + 1_000));
    store.storeSession("o", ["s", "t"], session("live", ["s", "t"], T0 + 3_600_000));

    expect(store.getSession("o", ["s"])?.token).toBe("live");
  });

  test("a token with no expiry never expires", () => {
    setSystemTime(T0);
    const store = new OAuth2SessionStore();
    store.storeSession("o", ["s"], session("forever", ["s"]));

    setSystemTime(T0 + 365 * 24 * 3_600_000);
    expect(store.getSession("o", ["s"])?.token).toBe("forever");
  });

  test("deleting the last session for an owner removes the owner entirely", () => {
    const store = new OAuth2SessionStore();
    store.storeSession("o", ["s"], session("t", ["s"]));

    expect(store.deleteSession("o", ["s"])?.token).toBe("t");
    expect(store.getSession("o", ["s"])).toBeUndefined();
    expect(store.cache.has("o")).toBe(false);
    expect(store.deleteSession("o", ["s"])).toBeUndefined();
  });

  test("statistics counts live and expired sessions separately", () => {
    setSystemTime(T0);
    const store = new OAuth2SessionStore();
    store.storeSession("a", ["s"], session("live", ["s"], T0 + 3_600_000));
    store.storeSession("a", ["t"], session("dead", ["t"], T0 + 1_000));
    store.storeSession("b", [], session("forever", []));

    expect(store.statistics()).toEqual({ total: 3, active: 2, expired: 1 });
  });
});

// The rest drives the real SDK: a PipeshubCore configured with a client id and
// secret, calling generated operations, with only fetch faked. The fake plays
// both the token endpoint and the API.

type TokenReply = { status?: number; body?: unknown };

function oauthServer(tokenReplies: TokenReply[] = []) {
  const tokenRequests: URLSearchParams[] = [];
  const tokenURLs: string[] = [];
  const apiAuth: Array<string | null> = [];
  let issued = 0;

  const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
    const req = input as Request;
    const url = new URL(req.url);
    if (url.pathname.endsWith("/oauth2/token")) {
      tokenURLs.push(url.toString());
      tokenRequests.push(new URLSearchParams(await req.text()));
      const reply = tokenReplies[tokenRequests.length - 1];
      if (reply) {
        return Response.json(reply.body ?? {}, { status: reply.status ?? 200 });
      }
      issued += 1;
      return Response.json({
        access_token: `token-${issued}`,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    apiAuth.push(req.headers.get("authorization"));
    return Response.json({ _id: "u1", agents: [] });
  };

  return { fetcher, tokenRequests, tokenURLs, apiAuth };
}

function oauthClient(
  fetcher: (input: RequestInfo | URL) => Promise<Response>,
  security: Security | (() => Promise<Security>) = {
    oauth2: { clientID: "cid", clientSecret: "secret", tokenURL: "/api/v1/oauth2/token" },
  },
) {
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security,
    httpClient: new HTTPClient({ fetcher }),
  });
}

describe("client credentials through the SDK", () => {
  test("fetches a token once and reuses it for later calls", async () => {
    const srv = oauthServer();
    const client = oauthClient(srv.fetcher);

    const first = await usersGetUserById(client, { id: "u1" });
    const second = await usersGetUserById(client, { id: "u1" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(srv.tokenRequests).toHaveLength(1);
    expect(srv.apiAuth).toEqual(["Bearer token-1", "Bearer token-1"]);
  });

  test("the token request is a client_credentials grant for the operation's scopes", async () => {
    const srv = oauthServer();
    await usersGetUserById(oauthClient(srv.fetcher), { id: "u1" });

    const form = srv.tokenRequests[0]!;
    expect(form.get("grant_type")).toBe("client_credentials");
    expect(form.get("client_id")).toBe("cid");
    expect(form.get("client_secret")).toBe("secret");
    expect(form.get("scope")).toBe("user:read");
    expect(srv.tokenURLs[0]).toBe("http://pipeshub.test/api/v1/oauth2/token");
  });

  test("an operation needing a different scope gets its own token", async () => {
    const srv = oauthServer();
    const client = oauthClient(srv.fetcher);

    await usersGetUserById(client, { id: "u1" });
    await agentsListAgents(client, {});

    expect(srv.tokenRequests.map((f) => f.get("scope"))).toEqual(["user:read", "agent:read"]);
    expect(srv.apiAuth).toEqual(["Bearer token-1", "Bearer token-2"]);
  });

  test("an expired token is replaced before the next call", async () => {
    setSystemTime(T0);
    const srv = oauthServer();
    const client = oauthClient(srv.fetcher);

    await usersGetUserById(client, { id: "u1" });
    // expires_in is 3600s; inside the 60s margin the cached token is stale.
    setSystemTime(T0 + 3_541_000);
    await usersGetUserById(client, { id: "u1" });

    expect(srv.tokenRequests).toHaveLength(2);
    expect(srv.apiAuth).toEqual(["Bearer token-1", "Bearer token-2"]);
  });

  test("a failed token request fails the call without sending it, and is retried next time", async () => {
    const srv = oauthServer([{ status: 401, body: { error: "invalid_client" } }]);
    const client = oauthClient(srv.fetcher);

    const failed = await usersGetUserById(client, { id: "u1" });

    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(String((failed.error as Error & { cause?: unknown }).cause))
      .toContain("Received unexpected status code 401 while fetching token");
    // Nothing reached the API with a missing or made-up credential.
    expect(srv.apiAuth).toEqual([]);

    // The failure was not cached: the next call asks again and succeeds.
    const ok = await usersGetUserById(client, { id: "u1" });
    expect(ok.ok).toBe(true);
    expect(srv.tokenRequests).toHaveLength(2);
    expect(srv.apiAuth).toEqual(["Bearer token-1"]);
  });

  test("a token response without an access_token is rejected, not sent as a bearer", async () => {
    const srv = oauthServer([{ body: { token_type: "Bearer" } }]);

    const res = await usersGetUserById(oauthClient(srv.fetcher), { id: "u1" });

    expect(res.ok).toBe(false);
    expect(srv.apiAuth).toEqual([]);
  });

  test("different client credentials never share a cached token", async () => {
    // A security callback is how a caller rotates credentials per request.
    const srv = oauthServer();
    let clientID = "tenant-a";
    const client = oauthClient(srv.fetcher, async () => ({
      oauth2: { clientID, clientSecret: `${clientID}-secret`, tokenURL: "/api/v1/oauth2/token" },
    }));

    await usersGetUserById(client, { id: "u1" });
    clientID = "tenant-b";
    await usersGetUserById(client, { id: "u1" });
    clientID = "tenant-a";
    await usersGetUserById(client, { id: "u1" });

    expect(srv.tokenRequests.map((f) => f.get("client_id"))).toEqual(["tenant-a", "tenant-b"]);
    expect(srv.apiAuth).toEqual(["Bearer token-1", "Bearer token-2", "Bearer token-1"]);
  });

  test("with only a bearer token configured, no token request is made", async () => {
    const srv = oauthServer();
    await usersGetUserById(oauthClient(srv.fetcher, { bearerAuth: "pat" }), { id: "u1" });

    expect(srv.tokenRequests).toHaveLength(0);
    expect(srv.apiAuth).toEqual(["Bearer pat"]);
  });
});

describe("ClientCredentialsHook.afterError", () => {
  // The hook's own contract: a 401 from the API evicts the cached token so the
  // next request fetches a fresh one. (See the PR description for why the SDK
  // does not currently route a 401 here.)
  test("a 401 evicts the cached token so the next request fetches a new one", async () => {
    const srv = oauthServer();
    const hook = new ClientCredentialsHook();
    hook.sdkInit({ httpClient: new HTTPClient({ fetcher: srv.fetcher }) });
    const ctx = {
      baseURL: "http://pipeshub.test/api/v1",
      operationID: "getUserById",
      oAuth2Scopes: ["user:read"],
      securitySource: {
        oauth2: { clientID: "cid", clientSecret: "secret", tokenURL: "/api/v1/oauth2/token" },
      },
    } as unknown as Parameters<ClientCredentialsHook["beforeRequest"]>[0];
    const auth = async () =>
      (await hook.beforeRequest(ctx, new Request("http://pipeshub.test/api/v1/users/u1")))
        .headers.get("authorization");

    expect(await auth()).toBe("Bearer token-1");
    expect(await auth()).toBe("Bearer token-1");

    await hook.afterError(ctx, new Response(null, { status: 403 }), null);
    expect(await auth()).toBe("Bearer token-1");

    await hook.afterError(ctx, new Response(null, { status: 401 }), null);
    expect(await auth()).toBe("Bearer token-2");
  });
});
