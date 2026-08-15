import { describe, expect, test } from "bun:test";
import {
  customImageBoots,
  dropTrailingCommas,
  imageSkipReason,
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

describe("dropTrailingCommas", () => {
  test("a hand-edited config with trailing commas still parses", () => {
    // Without this the config is unreadable, which fails open and writes the
    // Dockerfile we were trying not to write — the opposite of the intent.
    const src = '{ "target": "docker", "sandbox": { "backend": "sprites", }, }';
    expect(JSON.parse(dropTrailingCommas(src))).toEqual({
      target: "docker",
      sandbox: { backend: "sprites" },
    });
  });

  test("a comma inside a string is left alone", () => {
    const src = '{ "note": "a, b, ]", "target": "docker" }';
    expect(JSON.parse(dropTrailingCommas(src)).note).toBe("a, b, ]");
  });
});

describe("the deployment shapes that actually ship", () => {
  test("v1: target docker with the sprites backend skips the Dockerfile", () => {
    // This is the combination our own guide documents, so it is the one that
    // must not regress. `target` says where the control plane runs; `backend`
    // says where sandboxes run, and only the latter decides this.
    expect(customImageBoots({ target: "docker", backend: "sprites" })).toBe(false);
    expect(imageSkipReason({ target: "docker", backend: "sprites" }))
      .toBe("sprites-ignores-image");
  });

  test("an AWS control plane with Sprites sandboxes is NOT MicroVM", () => {
    // `backend: "aws"` requires `target: "aws"`, but not the reverse
    // (config.js:1106). Reporting this shape as MicroVM would tell the operator
    // the CLI can never be installed, which is false — Sprites install it on
    // first use.
    expect(imageSkipReason({ target: "aws", backend: "sprites" }))
      .toBe("sprites-ignores-image");
  });

  test("Lambda MicroVM is reported as itself", () => {
    expect(imageSkipReason({ target: "aws", backend: "aws" })).toBe("aws-microvm");
  });

  test("a plain local docker deploy still gets a Dockerfile", () => {
    expect(imageSkipReason({ target: "docker" })).toBeNull();
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
