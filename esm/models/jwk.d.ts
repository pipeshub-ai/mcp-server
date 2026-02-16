import * as z from "zod";
/**
 * JSON Web Key (RFC 7517).
 *
 * @remarks
 * Public key for verifying JWT signatures.
 */
export type Jwk = {
    kty?: string | undefined;
    use?: string | undefined;
    alg?: string | undefined;
    kid?: string | undefined;
    n?: string | undefined;
    e?: string | undefined;
};
export declare const Jwk$zodSchema: z.ZodType<Jwk>;
//# sourceMappingURL=jwk.d.ts.map