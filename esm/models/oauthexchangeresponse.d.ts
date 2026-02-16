import * as z from "zod";
/**
 * OAuth token response
 */
export type OAuthExchangeResponse = {
    access_token?: string | undefined;
    id_token?: string | undefined;
    token_type?: string | undefined;
    expires_in?: number | undefined;
};
export declare const OAuthExchangeResponse$zodSchema: z.ZodType<OAuthExchangeResponse>;
//# sourceMappingURL=oauthexchangeresponse.d.ts.map