import { describe, expect, test } from "bun:test";
import {
  customImageBoots,
  stripJsonComments,
} from "../src/cli/init-qm.js";

// A Dockerfile that cannot run is worse than no Dockerfile. It reads as the
// supported install path, so when the binary turns out to be missing the
// operator debugs the file rather than learning the image was never used.

describe("stripJsonComments", () => {
  test("a URL's // survives", () => {
    // The classic failure: naive comment-stripping eats the second slash of
    // https:// and turns a valid config into a parse error, in a file the
    // operator did not know we read.
    const src = '{ "publicUrl": "https://example.com/x", "target": "docker" }';
    expect(JSON.parse(stripJsonComments(src))).toEqual({
      publicUrl: "https://example.com/x",
      target: "docker",
    });
  });

  test("line and block comments go", () => {
    const src = `{
      // which backend
      "target": "fly", /* inline */
      "sandbox": { "backend": "sprites" } // trailing
    }`;
    expect(JSON.parse(stripJsonComments(src))).toEqual({
      target: "fly",
      sandbox: { backend: "sprites" },
    });
  });

  test("an escaped quote inside a string does not end it", () => {
    const src = '{ "note": "a \\" then // not a comment", "target": "docker" }';
    expect(JSON.parse(stripJsonComments(src)).target).toBe("docker");
  });
});

describe("customImageBoots", () => {
  test("Sprites cannot boot a custom image", () => {
    // yc-software/qm#272 — the published image is ignored, the stock base boots.
    expect(customImageBoots({ backend: "sprites" })).toBe(false);
    expect(customImageBoots({ target: "fly" })).toBe(false);
  });

  test("AWS MicroVM cannot install a tool binary", () => {
    // yc-software/qm#350 — no install mechanism exists at all.
    expect(customImageBoots({ target: "aws" })).toBe(false);
    expect(customImageBoots({ backend: "aws" })).toBe(false);
  });

  test("a local docker target still gets the Dockerfile", () => {
    expect(customImageBoots({ target: "docker" })).toBe(true);
  });

  test("an unreadable or absent config scaffolds as before", () => {
    // Guessing wrong in this direction removes a file someone needs, so an
    // unknown shape must keep the previous behaviour rather than assume.
    expect(customImageBoots(null)).toBe(true);
    expect(customImageBoots({})).toBe(true);
    expect(customImageBoots({ target: "something-new" })).toBe(true);
  });
});
