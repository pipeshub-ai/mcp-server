import * as z from "zod";
/**
 * Request body for Revoke search access
 */
export type UnshareSearchRequestBody = {
    userIds: Array<string>;
};
export declare const UnshareSearchRequestBody$zodSchema: z.ZodType<UnshareSearchRequestBody>;
export type UnshareSearchRequest = {
    searchId: string;
    body: UnshareSearchRequestBody;
};
export declare const UnshareSearchRequest$zodSchema: z.ZodType<UnshareSearchRequest>;
//# sourceMappingURL=unsharesearchop.d.ts.map