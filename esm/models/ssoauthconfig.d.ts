import * as z from "zod";
/**
 * SAML SSO authentication configuration
 */
export type SSOAuthConfig = {
    entryPoint: string;
    certificate: string;
    emailKey: string;
};
export declare const SSOAuthConfig$zodSchema: z.ZodType<SSOAuthConfig>;
//# sourceMappingURL=ssoauthconfig.d.ts.map