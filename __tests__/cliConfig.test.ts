import { describe, expect, test } from "bun:test";
import {
  assertTransport,
  CliError,
  cleartextAllowed,
  describeToken,
  EXIT,
  mcpEndpoint,
  originSource,
  resolveOrigin,
  resolveToken,
  tokenSource,
} from "../src/cli/config.js";

// The CLI contract in AGENTS.md is what agents branch on: two token variables,
// two URL variables, an origin that is always normalized, `{origin}/mcp`, and a
// cleartext rule that decides whether a credential may cross plain HTTP. None of
// it was covered, and the last of those is the one that leaks a token if it is
// wrong.

const env = (vars: Record<string, string>): NodeJS.ProcessEnv =>
  vars as NodeJS.ProcessEnv;

describe("resolveToken", () => {
  test("prefers PIPESHUB_TOKEN, which is what the keychain produces", () => {
    expect(resolveToken(env({ PIPESHUB_TOKEN: "a", PIPESHUB_MCP_TOKEN: "b" }))).toBe("a");
  });

  test("falls back to PIPESHUB_MCP_TOKEN, which is what the paste block emits", () => {
    expect(resolveToken(env({ PIPESHUB_MCP_TOKEN: "b" }))).toBe("b");
  });

  test("whitespace around a pasted token is not part of it", () => {
    expect(resolveToken(env({ PIPESHUB_TOKEN: "  a\n" }))).toBe("a");
  });

  test("a variable set to blank is the same as not set", () => {
    // Otherwise a stray `export PIPESHUB_TOKEN=` shadows a good value in the
    // other variable and the CLI reports "not connected" while holding one.
    expect(resolveToken(env({ PIPESHUB_TOKEN: "   ", PIPESHUB_MCP_TOKEN: "b" }))).toBe("b");
  });

  test("no token at all is null, not an empty string", () => {
    expect(resolveToken(env({}))).toBeNull();
  });
});

describe("tokenSource", () => {
  test("names the variable that supplied the value", () => {
    expect(tokenSource(env({ PIPESHUB_MCP_TOKEN: "b" }))).toBe("PIPESHUB_MCP_TOKEN");
    expect(tokenSource(env({ PIPESHUB_TOKEN: "a", PIPESHUB_MCP_TOKEN: "b" })))
      .toBe("PIPESHUB_TOKEN");
  });

  test("agrees with resolveToken about a blank variable", () => {
    expect(tokenSource(env({ PIPESHUB_TOKEN: " ", PIPESHUB_MCP_TOKEN: "b" })))
      .toBe("PIPESHUB_MCP_TOKEN");
  });

  test("nothing set names nothing", () => {
    expect(tokenSource(env({}))).toBeNull();
  });
});

describe("resolveOrigin", () => {
  test("keeps scheme, host and port and drops everything after them", () => {
    expect(resolveOrigin(env({ PIPESHUB_BASE_URL: "https://ph.example.com:8443/a/b?q=1#f" })))
      .toBe("https://ph.example.com:8443");
  });

  test("strips the /mcp that PIPESHUB_MCP_URL is documented to carry", () => {
    // This is the whole reason both variables are normalized: left alone, one
    // of them produces `…/mcp/mcp` and the other requests the wrong path.
    expect(resolveOrigin(env({ PIPESHUB_MCP_URL: "https://ph.example.com/mcp" })))
      .toBe("https://ph.example.com");
  });

  test("PIPESHUB_BASE_URL wins when both are set", () => {
    expect(resolveOrigin(env({
      PIPESHUB_BASE_URL: "https://base.example.com",
      PIPESHUB_MCP_URL: "https://mcp.example.com/mcp",
    }))).toBe("https://base.example.com");
  });

  test("nothing set is null", () => {
    expect(resolveOrigin(env({}))).toBeNull();
  });

  test("an unparseable URL is a usage error naming the variable that holds it", () => {
    try {
      resolveOrigin(env({ PIPESHUB_MCP_URL: "not a url" }));
      throw new Error("expected a CliError");
    } catch (e) {
      expect(e).toBeInstanceOf(CliError);
      expect((e as CliError).code).toBe(EXIT.USAGE);
      // Naming PIPESHUB_BASE_URL here would send the reader to edit a variable
      // they never set.
      expect((e as CliError).message).toContain("PIPESHUB_MCP_URL");
    }
  });

  test("a non-HTTP scheme is refused before it can become the string \"null\"", () => {
    for (const raw of ["ftp://h/x", "mailto:a@b.c", "foo://host"]) {
      try {
        resolveOrigin(env({ PIPESHUB_BASE_URL: raw }));
        throw new Error(`expected a CliError for ${raw}`);
      } catch (e) {
        expect(e).toBeInstanceOf(CliError);
        expect((e as CliError).code).toBe(EXIT.USAGE);
      }
    }
  });
});

describe("originSource", () => {
  test("names PIPESHUB_BASE_URL only when it actually holds something", () => {
    expect(originSource(env({ PIPESHUB_BASE_URL: "https://a" }))).toBe("PIPESHUB_BASE_URL");
    expect(originSource(env({ PIPESHUB_BASE_URL: "  ", PIPESHUB_MCP_URL: "https://b" })))
      .toBe("PIPESHUB_MCP_URL");
    expect(originSource(env({}))).toBe("PIPESHUB_MCP_URL");
  });
});

describe("mcpEndpoint", () => {
  test("is always {origin}/mcp", () => {
    expect(mcpEndpoint("https://ph.example.com")).toBe("https://ph.example.com/mcp");
  });

  test("a trailing slash does not produce a double one", () => {
    expect(mcpEndpoint("https://ph.example.com///")).toBe("https://ph.example.com/mcp");
  });
});

describe("cleartextAllowed", () => {
  const allowed = [
    "localhost", "app.localhost", "127.0.0.1", "127.1.2.3", "::1",
    "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1",
    "fd00:abcd::1", "fc00::1", "fe80::1",
    "host.docker.internal",
    "pipeshub-ai", "mongodb",
    "svc.local", "api.internal", "pipeshub.svc", "pipeshub.svc.cluster.local",
  ];
  for (const host of allowed) {
    test(`allows ${host}`, () => expect(cleartextAllowed(host)).toBe(true));
  }

  const refused = [
    "evil.example", "pipeshub.example.com", "example.com",
    // Neighbours of the private ranges, which is where an off-by-one lands.
    "172.15.0.1", "172.32.0.1", "11.0.0.1", "192.169.1.1", "169.253.1.1",
    // fe70/fec0 sit outside fe80::/10, and fb00 outside fc00::/7.
    "fe70::1", "fec0::1", "fb00::1",
    // Public IPv6. These have no dot, so before the literal was decided ahead
    // of the single-label rule they read as compose short names and were handed
    // the bearer token in cleartext.
    "2001:db8::1", "2606:4700:4700::1111", "[2606:4700:4700::1111]",
  ];
  for (const host of refused) {
    test(`refuses ${host}`, () => expect(cleartextAllowed(host)).toBe(false));
  }

  test("is not case sensitive", () => {
    expect(cleartextAllowed("LOCALHOST")).toBe(true);
    expect(cleartextAllowed("API.INTERNAL")).toBe(true);
  });
});

describe("assertTransport", () => {
  test("https is always fine", () => {
    expect(() => assertTransport("https://evil.example", false)).not.toThrow();
  });

  test("http to a private host is fine", () => {
    expect(() => assertTransport("http://localhost:3000", false)).not.toThrow();
    expect(() => assertTransport("http://pipeshub-ai:3000", false)).not.toThrow();
  });

  test("http to a public host refuses rather than sending the credential", () => {
    try {
      assertTransport("http://pipeshub.example.com", false);
      throw new Error("expected a CliError");
    } catch (e) {
      expect(e).toBeInstanceOf(CliError);
      expect((e as CliError).code).toBe(EXIT.USAGE);
      expect((e as CliError).message).toContain("cleartext");
    }
  });

  test("--insecure-http is the documented override and nothing else is", () => {
    expect(() => assertTransport("http://pipeshub.example.com", true)).not.toThrow();
  });

  test("an IPv6 literal is unwrapped before the rule is applied", () => {
    // `new URL(...).hostname` keeps the brackets, so a rule that forgot to
    // strip them would refuse every loopback IPv6 origin.
    expect(() => assertTransport("http://[::1]:3000", false)).not.toThrow();
  });
});

describe("describeToken", () => {
  const jwt = (claims: Record<string, unknown>): string =>
    ["h", Buffer.from(JSON.stringify(claims)).toString("base64url"), "s"].join(".");

  test("reads the non-secret claims a human is allowed to see", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const d = describeToken(jwt({
      userId: "u1", orgId: "o1", fullName: "A Person",
      scope: "semantic:write kb:read", exp,
    }));
    expect(d).toEqual({
      userId: "u1",
      orgId: "o1",
      fullName: "A Person",
      scopes: ["semantic:write", "kb:read"],
      expiresAt: new Date(exp * 1000).toISOString(),
      expired: false,
    });
  });

  test("accepts scopes as a list as well as a space-separated string", () => {
    expect(describeToken(jwt({ scopes: ["a", "b", 7] })).scopes).toEqual(["a", "b"]);
  });

  test("says so when the token has already expired", () => {
    expect(describeToken(jwt({ exp: Math.floor(Date.now() / 1000) - 1 })).expired).toBe(true);
  });

  test("an unreadable token describes nothing rather than throwing", () => {
    // `pipeshub whoami` has to keep working on a malformed value; the empty
    // description is what tells the reader the credential is not a JWT.
    for (const bad of ["", "not-a-jwt", "a.b", "a.!!!.c", "a.b.c.d"]) {
      expect(describeToken(bad)).toEqual({
        userId: null, orgId: null, fullName: null,
        scopes: [], expiresAt: null, expired: null,
      });
    }
  });

  test("never returns the token itself", () => {
    const token = jwt({ userId: "u1" });
    expect(JSON.stringify(describeToken(token))).not.toContain(token.split(".")[1]);
  });
});
