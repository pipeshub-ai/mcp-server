import * as z from "zod";
/**
 * Generic OAuth 2.0 provider configuration
 */
export type GenericOAuthConfig = {
    providerName: string;
    clientId: string;
    clientSecret?: string | undefined;
    authorizationUrl?: string | undefined;
    tokenEndpoint?: string | undefined;
    userInfoEndpoint?: string | undefined;
    scope?: string | undefined;
    redirectUri?: string | undefined;
};
export declare const GenericOAuthConfig$zodSchema: z.ZodType<GenericOAuthConfig>;
//# sourceMappingURL=genericoauthconfig.d.ts.map