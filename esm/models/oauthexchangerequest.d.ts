import * as z from "zod";
/**
 * Request to exchange OAuth authorization code for tokens
 */
export type OAuthExchangeRequest = {
    code: string;
    email: string;
    provider: string;
    redirectUri: string;
};
export declare const OAuthExchangeRequest$zodSchema: z.ZodType<OAuthExchangeRequest>;
//# sourceMappingURL=oauthexchangerequest.d.ts.map