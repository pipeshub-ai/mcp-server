import * as z from "zod";
/**
 * OAuth application credentials
 */
export type CreateOAuthConfigRequestConfig = {
    clientId: string;
    clientSecret: string;
    tenantId?: string | undefined;
};
export declare const CreateOAuthConfigRequestConfig$zodSchema: z.ZodType<CreateOAuthConfigRequestConfig>;
/**
 * Request to create OAuth configuration (admin only). Stores credentials that users select when setting up connectors.
 */
export type CreateOAuthConfigRequest = {
    oauthInstanceName: string;
    config: CreateOAuthConfigRequestConfig;
    baseUrl?: string | undefined;
};
export declare const CreateOAuthConfigRequest$zodSchema: z.ZodType<CreateOAuthConfigRequest>;
//# sourceMappingURL=createoauthconfigrequest.d.ts.map