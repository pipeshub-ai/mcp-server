import { describe, expect, test } from "bun:test";
import { bytesToBase64 } from "../src/lib/base64.js";
import { bytesToBase64 as sharedBytesToBase64 } from "../src/mcp-server/shared.js";

// The previous implementation was `btoa(String.fromCodePoint(...u8arr))`, which
// passes one argument per byte. Past the engine's argument limit that throws
// "Maximum call stack size exceeded" — measured at 64 KB fine and 128 KB
// throwing, i.e. below the size of essentially any real PDF or image.
//
// It surfaced as `pipeshub_download_record` returning `isError: true` with that
// message for any non-text record, since `formatResult` base64-encodes image,
// audio, and resource bodies.

const patterned = (n: number): Uint8Array => {
  const u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8[i] = (i * 97 + 13) & 0xff;
  return u8;
};

const decode = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

for (const [label, encode] of [
  ["lib/base64", bytesToBase64],
  ["mcp-server/shared", sharedBytesToBase64],
] as const) {
  describe(`bytesToBase64 — ${label}`, () => {
    test("encodes an empty array", () => {
      expect(encode(new Uint8Array(0))).toBe("");
    });

    test("covers every byte value", () => {
      const all = new Uint8Array(256);
      for (let i = 0; i < 256; i++) all[i] = i;
      expect(decode(encode(all))).toEqual(all);
    });

    // Regression: these three sizes all threw before the chunked rewrite.
    for (const kb of [128, 512, 2048]) {
      test(`handles ${kb} KB without overflowing the stack`, () => {
        const u8 = patterned(kb * 1024);
        const round = decode(encode(u8));
        expect(round.length).toBe(u8.length);
        expect(round).toEqual(u8);
      });
    }

    test("produces the same output either side of the chunk boundary", () => {
      // 0x8000 is the chunk size; encoding must not depend on where it lands.
      for (const n of [0x7fff, 0x8000, 0x8001, 0x10000, 0x10001]) {
        const u8 = patterned(n);
        expect(decode(encode(u8))).toEqual(u8);
      }
    });
  });
}
