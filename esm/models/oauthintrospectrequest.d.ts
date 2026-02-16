import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Hint about token type
 */
export declare const OAuthIntrospectRequestTokenTypeHint: {
    readonly AccessToken: "access_token";
    readonly RefreshToken: "refresh_token";
};
/**
 * Hint about token type
 */
export type OAuthIntrospectRequestTokenTypeHint = ClosedEnum<typeof OAuthIntrospectRequestTokenTypeHint>;
export declare const OAuthIntrospectRequestTokenTypeHint$zodSchema: z.ZodEnum<{
    refresh_token: "refresh_token";
    access_token: "access_token";
}>;
/**
 * OAuth 2.0 Token Introspection Request (RFC 7662).
 *
 * @remarks
 * Check if a token is active and get its metadata.
 */
export type OAuthIntrospectRequest = {
    token: string;
    token_type_hint?: OAuthIntrospectRequestTokenTypeHint | undefined;
    client_id: string;
    client_secret?: string | undefined;
};
export declare const OAuthIntrospectRequest$zodSchema: z.ZodType<OAuthIntrospectRequest>;
//# sourceMappingURL=oauthintrospectrequest.d.ts.map