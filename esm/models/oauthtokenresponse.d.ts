import * as z from "zod";
/**
 * OAuth 2.0 Token Response (RFC 6749 Section 5.1).
 *
 * @remarks
 * Contains the access token and optional refresh/ID tokens.
 */
export type OAuthTokenResponse = {
    access_token?: string | undefined;
    token_type?: string | undefined;
    expires_in?: number | undefined;
    refresh_token?: string | undefined;
    scope?: string | undefined;
    id_token?: string | undefined;
};
export declare const OAuthTokenResponse$zodSchema: z.ZodType<OAuthTokenResponse>;
//# sourceMappingURL=oauthtokenresponse.d.ts.map