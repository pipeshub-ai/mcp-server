import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { OAuthCredentials } from "./oauthcredentials.js";
import { OtpCredentials } from "./otpcredentials.js";
import { PasswordCredentials } from "./passwordcredentials.js";
/**
 * Authentication method to use
 */
export declare const Method: {
    readonly SamlSso: "samlSso";
    readonly Otp: "otp";
    readonly Password: "password";
    readonly Google: "google";
    readonly Microsoft: "microsoft";
    readonly AzureAd: "azureAd";
    readonly Oauth: "oauth";
};
/**
 * Authentication method to use
 */
export type Method = ClosedEnum<typeof Method>;
export declare const Method$zodSchema: z.ZodEnum<{
    password: "password";
    otp: "otp";
    samlSso: "samlSso";
    google: "google";
    microsoft: "microsoft";
    azureAd: "azureAd";
    oauth: "oauth";
}>;
/**
 * Credentials based on the authentication method
 */
export type Credentials = PasswordCredentials | OtpCredentials | OAuthCredentials | string;
export declare const Credentials$zodSchema: z.ZodType<Credentials>;
/**
 * Request to authenticate using specified method.
 *
 * @remarks
 * **Credential format varies by method:**
 * - `password`: `{ password: "string" }`
 * - `otp`: `{ otp: "123456" }` (6-digit code)
 * - `google`: `"google-id-token-string"`
 * - `microsoft`: `{ accessToken: "...", idToken: "..." }`
 * - `azureAd`: `{ accessToken: "...", idToken: "..." }`
 * - `oauth`: `{ accessToken: "...", idToken: "..." }`
 * - `samlSso`: handled via redirect flow
 */
export type AuthenticateRequest = {
    method: Method;
    credentials: PasswordCredentials | OtpCredentials | OAuthCredentials | string;
    email?: string | undefined;
    cfTurnstileResponse?: string | undefined;
};
export declare const AuthenticateRequest$zodSchema: z.ZodType<AuthenticateRequest>;
//# sourceMappingURL=authenticaterequest.d.ts.map