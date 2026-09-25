import { describe, expect, test } from "bun:test";
import { parseServerURLFlag } from "../src/mcp-server/cli/flag-parsers.js";

describe("parseServerURLFlag", () => {
  test("a bare origin gets the API base path", () => {
    expect(parseServerURLFlag("https://pipeshub.example.com")).toBe("https://pipeshub.example.com/api/v1");
    expect(parseServerURLFlag("http://localhost:3000/")).toBe("http://localhost:3000/api/v1");
  });

  test("a URL that already has a path is taken as given", () => {
    // Existing setups that pass /api/v1, and instances served under a prefix.
    expect(parseServerURLFlag("https://p.example.com/api/v1")).toBe("https://p.example.com/api/v1");
    expect(parseServerURLFlag("https://p.example.com/pipeshub/api/v1")).toBe("https://p.example.com/pipeshub/api/v1");
  });

  test("something that is not a web address says what to pass instead", () => {
    // "pipeshub.example.com:443" parses as a URL whose scheme is the host name,
    // so the scheme check is what catches the most likely typo.
    for (const bad of ["pipeshub.example.com", "pipeshub.example.com:443", "ftp://p.example.com"]) {
      expect(() => parseServerURLFlag(bad)).toThrow(
        `"${bad}" is not a web address. Pass your PipesHub address including https://, `
          + "for example --server-url https://pipeshub.example.com",
      );
    }
  });
});
