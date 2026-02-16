import * as z from "zod";
export type RevokeAllOAuthAppTokensRequest = {
    appId: string;
};
export declare const RevokeAllOAuthAppTokensRequest$zodSchema: z.ZodType<RevokeAllOAuthAppTokensRequest>;
/**
 * All tokens revoked
 */
export type RevokeAllOAuthAppTokensResponse = {
    message?: string | undefined;
    count?: number | undefined;
};
export declare const RevokeAllOAuthAppTokensResponse$zodSchema: z.ZodType<RevokeAllOAuthAppTokensResponse>;
//# sourceMappingURL=revokealloauthapptokensop.d.ts.map