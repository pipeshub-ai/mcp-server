import * as z from "zod";
/**
 * OpenID Connect Discovery Response (RFC 8414).
 *
 * @remarks
 * Contains authorization server metadata.
 */
export type OpenIDConfiguration = {
    issuer?: string | undefined;
    authorization_endpoint?: string | undefined;
    token_endpoint?: string | undefined;
    userinfo_endpoint?: string | undefined;
    revocation_endpoint?: string | undefined;
    introspection_endpoint?: string | undefined;
    jwks_uri?: string | undefined;
    scopes_supported?: Array<string> | undefined;
    response_types_supported?: Array<string> | undefined;
    grant_types_supported?: Array<string> | undefined;
    token_endpoint_auth_methods_supported?: Array<string> | undefined;
    subject_types_supported?: Array<string> | undefined;
    id_token_signing_alg_values_supported?: Array<string> | undefined;
    claims_supported?: Array<string> | undefined;
    code_challenge_methods_supported?: Array<string> | undefined;
};
export declare const OpenIDConfiguration$zodSchema: z.ZodType<OpenIDConfiguration>;
//# sourceMappingURL=openidconfiguration.d.ts.map