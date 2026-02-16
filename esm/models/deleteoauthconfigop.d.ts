import * as z from "zod";
export type DeleteOAuthConfigRequest = {
    connectorType: string;
    configId: string;
};
export declare const DeleteOAuthConfigRequest$zodSchema: z.ZodType<DeleteOAuthConfigRequest>;
/**
 * OAuth configuration deleted
 */
export type DeleteOAuthConfigResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const DeleteOAuthConfigResponse$zodSchema: z.ZodType<DeleteOAuthConfigResponse>;
//# sourceMappingURL=deleteoauthconfigop.d.ts.map