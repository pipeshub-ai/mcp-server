import * as z from "zod";
import { OAuthConfig } from "./oauthconfig.js";
export type UpdateOAuthConfigConfig = {
    clientId?: string | undefined;
    clientSecret?: string | undefined;
    tenantId?: string | undefined;
};
export declare const UpdateOAuthConfigConfig$zodSchema: z.ZodType<UpdateOAuthConfigConfig>;
/**
 * Request payload
 */
export type UpdateOAuthConfigRequestBody = {
    oauthInstanceName?: string | undefined;
    config?: UpdateOAuthConfigConfig | undefined;
};
export declare const UpdateOAuthConfigRequestBody$zodSchema: z.ZodType<UpdateOAuthConfigRequestBody>;
export type UpdateOAuthConfigRequest = {
    connectorType: string;
    configId: string;
    body: UpdateOAuthConfigRequestBody;
};
export declare const UpdateOAuthConfigRequest$zodSchema: z.ZodType<UpdateOAuthConfigRequest>;
/**
 * OAuth configuration updated
 */
export type UpdateOAuthConfigResponse = {
    success?: boolean | undefined;
    oauthConfig?: OAuthConfig | undefined;
};
export declare const UpdateOAuthConfigResponse$zodSchema: z.ZodType<UpdateOAuthConfigResponse>;
//# sourceMappingURL=updateoauthconfigop.d.ts.map