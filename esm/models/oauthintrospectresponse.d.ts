import * as z from "zod";
/**
 * OAuth 2.0 Token Introspection Response (RFC 7662).
 *
 * @remarks
 * Contains token metadata if active, or just `active: false` if not.
 */
export type OAuthIntrospectResponse = {
    active: boolean;
    scope?: string | undefined;
    client_id?: string | undefined;
    username?: string | undefined;
    token_type?: string | undefined;
    exp?: number | undefined;
    iat?: number | undefined;
    nbf?: number | undefined;
    sub?: string | undefined;
    aud?: string | undefined;
    iss?: string | undefined;
    jti?: string | undefined;
};
export declare const OAuthIntrospectResponse$zodSchema: z.ZodType<OAuthIntrospectResponse>;
//# sourceMappingURL=oauthintrospectresponse.d.ts.map