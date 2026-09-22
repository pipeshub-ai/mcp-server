import { describe, expect, test } from "bun:test";
import { PipeshubCore } from "../src/core.js";
import { HTTPClient } from "../src/lib/http.js";
import { tool$pipeshubDirectory } from "../src/mcp-server/tools/pipeshubDirectory.js";

// `whoami` is the command people run to answer "is my login working?". The
// claims it reports come out of the token, which proves nothing about whether
// the server still accepts it -- a revoked token carries a perfectly good name
// and org. So the interesting part is the ladder between "confirmed", "could
// not check" and "rejected", and none of it was covered.

const USER_ID = "507f1f77bcf86cd799439011";

const jwt = (claims: Record<string, unknown>): string =>
  ["h", Buffer.from(JSON.stringify(claims)).toString("base64url"), "s"].join(".");

const liveClaims = (over: Record<string, unknown> = {}) => ({
  userId: USER_ID,
  orgId: "org-1",
  email: "a@example.com",
  fullName: "A Person",
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...over,
});

/** A client whose user-lookup endpoint answers however the test says. */
function client(
  bearerAuth: string | undefined,
  probe: { status?: number; body?: unknown; throws?: boolean } = {},
) {
  const fetcher = async () => {
    if (probe.throws) throw new Error("connect ECONNREFUSED");
    return Response.json(probe.body ?? { _id: USER_ID }, { status: probe.status ?? 200 });
  };
  return new PipeshubCore({
    serverURL: "http://pipeshub.test/api/v1",
    security: bearerAuth === undefined ? {} : { bearerAuth },
    httpClient: new HTTPClient({ fetcher }),
  });
}

const run = (c: PipeshubCore) =>
  tool$pipeshubDirectory.tool(
    c,
    { action: "whoami" } as never,
    { signal: new AbortController().signal } as never,
  );

const textOf = (r: { content: Array<{ text?: string }> }) =>
  r.content.map((c) => c.text ?? "").join("");
const jsonOf = (r: { content: Array<{ text?: string }> }) => JSON.parse(textOf(r));

describe("pipeshub_directory whoami", () => {
  test("a confirmed identity says so, and reports the token's claims", async () => {
    const out = await run(client(jwt(liveClaims())));

    expect(out.isError).toBeUndefined();
    const body = jsonOf(out);
    expect(body).toMatchObject({
      userId: USER_ID,
      orgId: "org-1",
      email: "a@example.com",
      fullName: "A Person",
      identityVerified: true,
    });
    expect(body.note).toBeUndefined();
  });

  test("no token at all explains what to do instead", async () => {
    // A dead end with no next step is the worst answer here: the caller has no
    // way to find the user and no idea why.
    const out = await run(client(undefined));

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("list_users");
  });

  test("an expired token is caught offline, without a round trip", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return Response.json({});
    };
    const c = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: jwt(liveClaims({ exp: Math.floor(Date.now() / 1000) - 60 })) },
      httpClient: new HTTPClient({ fetcher }),
    });

    const out = await run(c);

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("expired");
    expect(called).toBe(false);
  });

  test("a rejected token is an error, not a confident answer", async () => {
    // The case the whole verification exists for: a revoked token still decodes
    // to a perfectly good name and org, so reporting it as a successful login
    // would be wrong in exactly the situation someone ran whoami to detect.
    const out = await run(client(jwt(liveClaims()), { status: 401 }));

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("revoked");
    expect(textOf(out)).toContain("Personal Access Tokens");
  });

  test("an unreachable server answers from the token and says it is unchecked", async () => {
    const out = await run(client(jwt(liveClaims()), { throws: true }));

    const body = jsonOf(out);
    expect(body.identityVerified).toBe("unchecked");
    expect(body.userId).toBe(USER_ID);
    expect(body.note).toContain("token itself");
  });

  test("any other status is unchecked, and names the status", async () => {
    const out = await run(client(jwt(liveClaims()), { status: 503 }));

    const body = jsonOf(out);
    expect(body.identityVerified).toBe("unchecked");
    expect(body.note).toContain("503");
  });

  test("a token with no userId cannot be confirmed and says why", async () => {
    const out = await run(client(jwt(liveClaims({ userId: undefined }))));

    const body = jsonOf(out);
    expect(body.identityVerified).toBe("unchecked");
    expect(body.note).toContain("No userId claim");
  });

  test("identityVerified is never false", async () => {
    // `false` reads as "the server rejected this identity", which is a
    // different and far more alarming claim than "this was not checked". A
    // rejection is an error result instead.
    for (const probe of [{ throws: true }, { status: 503 }, { status: 404 }]) {
      const out = await run(client(jwt(liveClaims()), probe));
      if (out.isError) continue;
      expect(jsonOf(out).identityVerified).not.toBe(false);
    }
  });

  test("a token that is not a JWT is treated as no token", async () => {
    const out = await run(client("not-a-jwt"));

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("list_users");
  });
});

describe("pipeshub_directory get_user", () => {
  const getUser = (c: PipeshubCore, userId?: string) =>
    tool$pipeshubDirectory.tool(
      c,
      { action: "get_user", userId } as never,
      { signal: new AbortController().signal } as never,
    );

  test("a missing userId says where to get one instead of calling the API", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return Response.json({});
    };
    const c = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });

    const out = await getUser(c);

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("whoami");
    expect(called).toBe(false);
  });

  test("a failed lookup reports the status rather than a parse error", async () => {
    const out = await getUser(client("t", { status: 404, body: { message: "no such user" } }), USER_ID);

    expect(out.isError).toBe(true);
    expect(textOf(out)).toContain("404");
  });
});

describe("pipeshub_directory listings", () => {
  const listing = (action: string, extra: Record<string, unknown> = {}) => {
    const seen: { url?: string } = {};
    const fetcher = async (input: RequestInfo | URL) => {
      seen.url = (input as Request).url;
      return Response.json({ users: [], pagination: { page: 1 } });
    };
    const c = new PipeshubCore({
      serverURL: "http://pipeshub.test/api/v1",
      security: { bearerAuth: "t" },
      httpClient: new HTTPClient({ fetcher }),
    });
    return {
      seen,
      run: () =>
        tool$pipeshubDirectory.tool(
          c,
          { action, ...extra } as never,
          { signal: new AbortController().signal } as never,
        ),
    };
  };

  for (const action of ["list_users", "list_groups", "list_my_teams"]) {
    test(`${action} passes paging and search through to the server`, async () => {
      const { seen, run } = listing(action, { page: 3, limit: 25, search: "ada" });

      const out = await run();

      expect(out.isError).toBeUndefined();
      const url = new URL(seen.url!);
      expect(url.searchParams.get("page")).toBe("3");
      expect(url.searchParams.get("limit")).toBe("25");
      expect(url.searchParams.get("search")).toBe("ada");
    });

    test(`${action} reports a failed listing rather than an empty one`, async () => {
      // An empty list is a valid answer, so a failure that reads as one tells
      // the caller there are no users, no groups, or no teams.
      const fetcher = async () => Response.json({ message: "nope" }, { status: 500 });
      const c = new PipeshubCore({
        serverURL: "http://pipeshub.test/api/v1",
        security: { bearerAuth: "t" },
        httpClient: new HTTPClient({ fetcher }),
      });

      const out = await tool$pipeshubDirectory.tool(
        c,
        { action } as never,
        { signal: new AbortController().signal } as never,
      );

      expect(out.isError).toBe(true);
      expect(textOf(out)).toContain("500");
    });
  }
});
