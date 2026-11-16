// Tool and prompt arguments are written as raw zod shapes (`{ query: z.string() }`).
// The MCP SDK stopped exporting its shape helpers in v2; these keep the v1
// definitions, so every tool keeps the argument types it was written against.

import type * as z4 from "zod/v4/core";

export type ZodRawShapeCompat = Record<string, z4.$ZodType>;

/** Each key of shape `S` mapped to its schema's parsed value. */
export type ShapeOutput<S extends ZodRawShapeCompat> = {
  [K in keyof S]: z4.output<S[K]>;
};
