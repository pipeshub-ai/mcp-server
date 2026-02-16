import * as z from "zod";
/**
 * OneDrive/Microsoft 365 connector configuration
 */
export type OneDriveConfig = {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    hasAdminConsent?: boolean | undefined;
};
export declare const OneDriveConfig$zodSchema: z.ZodType<OneDriveConfig>;
//# sourceMappingURL=onedriveconfig.d.ts.map