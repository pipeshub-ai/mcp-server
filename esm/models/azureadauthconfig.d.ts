import * as z from "zod";
/**
 * Azure Active Directory authentication configuration
 */
export type AzureAdAuthConfig = {
    clientId: string;
    tenantId?: string | undefined;
};
export declare const AzureAdAuthConfig$zodSchema: z.ZodType<AzureAdAuthConfig>;
//# sourceMappingURL=azureadauthconfig.d.ts.map