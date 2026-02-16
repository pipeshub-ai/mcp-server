import * as z from "zod";
/**
 * SharePoint connector configuration
 */
export type SharePointConfig = {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    sharepointDomain: string;
    hasAdminConsent?: boolean | undefined;
};
export declare const SharePointConfig$zodSchema: z.ZodType<SharePointConfig>;
//# sourceMappingURL=sharepointconfig.d.ts.map