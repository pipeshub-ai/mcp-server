import * as z from "zod";
/**
 * Information about an OAuth scope
 */
export type OAuthScopeInfo = {
    name?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
};
export declare const OAuthScopeInfo$zodSchema: z.ZodType<OAuthScopeInfo>;
//# sourceMappingURL=oauthscopeinfo.d.ts.map