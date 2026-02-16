import * as z from "zod";
/**
 * Microsoft authentication configuration
 */
export type MicrosoftAuthConfig = {
    clientId: string;
    tenantId?: string | undefined;
};
export declare const MicrosoftAuthConfig$zodSchema: z.ZodType<MicrosoftAuthConfig>;
//# sourceMappingURL=microsoftauthconfig.d.ts.map