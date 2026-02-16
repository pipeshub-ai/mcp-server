import * as z from "zod";
import { Jwk } from "./jwk.js";
/**
 * JSON Web Key Set (RFC 7517).
 *
 * @remarks
 * Contains public keys for verifying token signatures.
 */
export type Jwks = {
    keys?: Array<Jwk> | undefined;
};
export declare const Jwks$zodSchema: z.ZodType<Jwks>;
//# sourceMappingURL=jwks.d.ts.map