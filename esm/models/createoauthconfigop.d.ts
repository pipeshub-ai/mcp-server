import * as z from "zod";
import { CreateOAuthConfigRequest } from "./createoauthconfigrequest.js";
import { OAuthConfig } from "./oauthconfig.js";
export type CreateOAuthConfigRequestRequest = {
    connectorType: string;
    body: CreateOAuthConfigRequest;
};
export declare const CreateOAuthConfigRequestRequest$zodSchema: z.ZodType<CreateOAuthConfigRequestRequest>;
/**
 * OAuth configuration created
 */
export type CreateOAuthConfigResponse = {
    success?: boolean | undefined;
    oauthConfig?: OAuthConfig | undefined;
    message?: string | undefined;
};
export declare const CreateOAuthConfigResponse$zodSchema: z.ZodType<CreateOAuthConfigResponse>;
//# sourceMappingURL=createoauthconfigop.d.ts.map