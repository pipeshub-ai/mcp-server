import * as z from "zod";
import { OAuthConfig } from "./oauthconfig.js";
export type GetOAuthConfigRequest = {
    connectorType: string;
    configId: string;
};
export declare const GetOAuthConfigRequest$zodSchema: z.ZodType<GetOAuthConfigRequest>;
/**
 * OAuth configuration retrieved
 */
export type GetOAuthConfigResponse = {
    success?: boolean | undefined;
    oauthConfig?: OAuthConfig | undefined;
};
export declare const GetOAuthConfigResponse$zodSchema: z.ZodType<GetOAuthConfigResponse>;
//# sourceMappingURL=getoauthconfigop.d.ts.map