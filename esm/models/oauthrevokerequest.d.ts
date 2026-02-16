import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Hint about token type (optional, improves performance)
 */
export declare const OAuthRevokeRequestTokenTypeHint: {
    readonly AccessToken: "access_token";
    readonly RefreshToken: "refresh_token";
};
/**
 * Hint about token type (optional, improves performance)
 */
export type OAuthRevokeRequestTokenTypeHint = ClosedEnum<typeof OAuthRevokeRequestTokenTypeHint>;
export declare const OAuthRevokeRequestTokenTypeHint$zodSchema: z.ZodEnum<{
    refresh_token: "refresh_token";
    access_token: "access_token";
}>;
/**
 * OAuth 2.0 Token Revocation Request (RFC 7009).
 *
 * @remarks
 * Revokes an access or refresh token.
 */
export type OAuthRevokeRequest = {
    token: string;
    token_type_hint?: OAuthRevokeRequestTokenTypeHint | undefined;
    client_id: string;
    client_secret?: string | undefined;
};
export declare const OAuthRevokeRequest$zodSchema: z.ZodType<OAuthRevokeRequest>;
//# sourceMappingURL=oauthrevokerequest.d.ts.map