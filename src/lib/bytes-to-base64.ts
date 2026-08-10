/**
 * Hand-maintained base64 encoder for binary payloads.
 *
 * Speakeasy's generated helper is:
 *   btoa(String.fromCodePoint(...u8arr))
 * which passes one argument per byte and throws "Maximum call stack size
 * exceeded" once the array is larger than the engine's argument limit
 * (between 64 KB and 128 KB on Node 24). That is smaller than a typical
 * PDF or image, so binary MCP results fail outright.
 *
 * Keep this file out of Speakeasy regeneration (see `.genignore`). The
 * generated wrappers in `src/lib/base64.ts` and `src/mcp-server/shared.ts`
 * re-export / call through here.
 */

const BASE64_CHUNK = 0x8000;

export function bytesToBase64(u8arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < u8arr.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...u8arr.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}
