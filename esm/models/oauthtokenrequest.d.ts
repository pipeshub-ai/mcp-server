import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * OAuth grant type:
 *
 * @remarks
 * - `authorization_code`: Exchange auth code for tokens
 * - `client_credentials`: Machine-to-machine auth
 * - `refresh_token`: Get new access token using refresh token
 */
export declare const GrantType: {
    readonly AuthorizationCode: "authorization_code";
    readonly ClientCredentials: "client_credentials";
    readonly RefreshToken: "refresh_token";
};
/**
 * OAuth grant type:
 *
 * @remarks
 * - `authorization_code`: Exchange auth code for tokens
 * - `client_credentials`: Machine-to-machine auth
 * - `refresh_token`: Get new access token using refresh token
 */
export type GrantType = ClosedEnum<typeof GrantType>;
export declare const GrantType$zodSchema: z.ZodEnum<{
    authorization_code: "authorization_code";
    client_credentials: "client_credentials";
    refresh_token: "refresh_token";
}>;
/**
 * OAuth 2.0 Token Request (RFC 6749 Section 4.1.3).
 *
 * @remarks
 * Request body for exchanging authorization code or credentials for tokens.
 */
export type OAuthTokenRequest = {
    grant_type: GrantType;
    code?: string | undefined;
    redirect_uri?: string | undefined;
    client_id?: string | undefined;
    client_secret?: string | undefined;
    refresh_token?: string | undefined;
    scope?: string | undefined;
    code_verifier?: string | undefined;
};
export declare const OAuthTokenRequest$zodSchema: z.ZodType<OAuthTokenRequest>;
//# sourceMappingURL=oauthtokenrequest.d.ts.map