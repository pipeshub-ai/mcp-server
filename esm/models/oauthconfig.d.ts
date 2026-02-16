import * as z from "zod";
/**
 * OAuth credentials (admin-only view)
 */
export type OAuthConfigConfig = {
    clientId?: string | undefined;
    clientSecret?: string | undefined;
    tenantId?: string | undefined;
};
export declare const OAuthConfigConfig$zodSchema: z.ZodType<OAuthConfigConfig>;
/**
 * OAuth configuration for a connector type. Created by admins to enable
 *
 * @remarks
 * OAuth authentication for connectors.
 */
export type OAuthConfig = {
    configId?: string | undefined;
    connectorType?: string | undefined;
    oauthInstanceName?: string | undefined;
    orgId?: string | undefined;
    createdBy?: string | undefined;
    config?: OAuthConfigConfig | undefined;
    baseUrl?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const OAuthConfig$zodSchema: z.ZodType<OAuthConfig>;
//# sourceMappingURL=oauthconfig.d.ts.map