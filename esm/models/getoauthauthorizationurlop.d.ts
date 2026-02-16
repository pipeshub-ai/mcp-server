import * as z from "zod";
export type GetOAuthAuthorizationUrlRequest = {
    connectorId: string;
    baseUrl?: string | undefined;
};
export declare const GetOAuthAuthorizationUrlRequest$zodSchema: z.ZodType<GetOAuthAuthorizationUrlRequest>;
/**
 * Authorization URL generated
 */
export type GetOAuthAuthorizationUrlResponse = {
    success?: boolean | undefined;
    authorizationUrl?: string | undefined;
    state?: string | undefined;
};
export declare const GetOAuthAuthorizationUrlResponse$zodSchema: z.ZodType<GetOAuthAuthorizationUrlResponse>;
//# sourceMappingURL=getoauthauthorizationurlop.d.ts.map