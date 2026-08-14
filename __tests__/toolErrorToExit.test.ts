import { describe, expect, test } from "bun:test";
import { toolErrorToExit } from "../src/cli/client.js";
import { EXIT } from "../src/cli/config.js";

// Scripts branch on these numbers, so a credential failure has to land on 3
// wherever it is detected. The awkward case is whoami's offline expiry check:
// it never makes a request, so there is no status code in the message, but
// "your credential is not valid" is exactly what exit 3 means.

describe("toolErrorToExit", () => {
  test("an HTTP status in the message wins", () => {
    expect(
      toolErrorToExit("PipesHub search failed (HTTP 401 Unauthorized). Invalid token."),
    ).toBe(EXIT.UNAUTHENTICATED);
    expect(
      toolErrorToExit("Model listing failed (HTTP 403 Forbidden). Insufficient scope."),
    ).toBe(EXIT.FORBIDDEN);
  });

  test("whoami's offline expiry error is unauthenticated, not a generic failure", () => {
    const message = "The access token expired on 2026-09-08T02:04:44.000Z. "
      + "Mint a new personal access token in PipesHub under "
      + "Developer Settings → Personal Access Tokens.";
    expect(toolErrorToExit(message)).toBe(EXIT.UNAUTHENTICATED);
  });

  test("whoami's revoked-token error is unauthenticated", () => {
    const message = "PipesHub rejected this access token (HTTP 401 Unauthorized), "
      + "so the identity in it is no longer valid — it has most likely been "
      + "revoked. Mint a new personal access token under Developer Settings → "
      + "Personal Access Tokens.";
    expect(toolErrorToExit(message)).toBe(EXIT.UNAUTHENTICATED);
  });

  test("an unrelated failure stays a generic error", () => {
    // The mapping must stay narrow: a parse failure is not an auth problem,
    // and reporting it as one sends people to re-mint a working token.
    expect(toolErrorToExit("Failed to parse response as JSON: Unexpected token"))
      .toBe(EXIT.ERROR);
    expect(toolErrorToExit("Empty response from server")).toBe(EXIT.ERROR);
  });

  test("rate limiting is distinguished from auth failure", () => {
    expect(toolErrorToExit("PipesHub search failed (HTTP 429 Too Many Requests)."))
      .toBe(EXIT.RATE_LIMITED);
  });
});
