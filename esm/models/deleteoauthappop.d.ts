import * as z from "zod";
export type DeleteOAuthAppRequest = {
    appId: string;
};
export declare const DeleteOAuthAppRequest$zodSchema: z.ZodType<DeleteOAuthAppRequest>;
/**
 * OAuth app deleted
 */
export type DeleteOAuthAppResponse = {
    message?: string | undefined;
};
export declare const DeleteOAuthAppResponse$zodSchema: z.ZodType<DeleteOAuthAppResponse>;
//# sourceMappingURL=deleteoauthappop.d.ts.map