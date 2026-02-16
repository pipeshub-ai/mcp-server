import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of authentication method:
 *
 * @remarks
 * - `password`: Email/password authentication
 * - `otp`: One-time password via email (6-digit, expires in 10 minutes)
 * - `google`: Google OAuth 2.0
 * - `microsoft`: Microsoft OAuth 2.0
 * - `azureAd`: Azure Active Directory
 * - `samlSso`: SAML 2.0 Single Sign-On
 * - `oauth`: Generic OAuth 2.0 provider
 */
export declare const AuthMethodType: {
    readonly SamlSso: "samlSso";
    readonly Otp: "otp";
    readonly Password: "password";
    readonly Google: "google";
    readonly Microsoft: "microsoft";
    readonly AzureAd: "azureAd";
    readonly Oauth: "oauth";
};
/**
 * Type of authentication method:
 *
 * @remarks
 * - `password`: Email/password authentication
 * - `otp`: One-time password via email (6-digit, expires in 10 minutes)
 * - `google`: Google OAuth 2.0
 * - `microsoft`: Microsoft OAuth 2.0
 * - `azureAd`: Azure Active Directory
 * - `samlSso`: SAML 2.0 Single Sign-On
 * - `oauth`: Generic OAuth 2.0 provider
 */
export type AuthMethodType = ClosedEnum<typeof AuthMethodType>;
export declare const AuthMethodType$zodSchema: z.ZodEnum<{
    password: "password";
    otp: "otp";
    samlSso: "samlSso";
    google: "google";
    microsoft: "microsoft";
    azureAd: "azureAd";
    oauth: "oauth";
}>;
/**
 * Authentication method configuration
 */
export type AuthMethod = {
    type: AuthMethodType;
};
export declare const AuthMethod$zodSchema: z.ZodType<AuthMethod>;
//# sourceMappingURL=authmethod.d.ts.map