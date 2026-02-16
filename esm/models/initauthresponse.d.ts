import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { AuthProviders } from "./authproviders.js";
export declare const InitAuthResponseAllowedMethod: {
    readonly SamlSso: "samlSso";
    readonly Otp: "otp";
    readonly Password: "password";
    readonly Google: "google";
    readonly Microsoft: "microsoft";
    readonly AzureAd: "azureAd";
    readonly Oauth: "oauth";
};
export type InitAuthResponseAllowedMethod = ClosedEnum<typeof InitAuthResponseAllowedMethod>;
export declare const InitAuthResponseAllowedMethod$zodSchema: z.ZodEnum<{
    password: "password";
    otp: "otp";
    samlSso: "samlSso";
    google: "google";
    microsoft: "microsoft";
    azureAd: "azureAd";
    oauth: "oauth";
}>;
/**
 * Response containing available authentication methods and session info
 */
export type InitAuthResponse = {
    currentStep?: number | undefined;
    allowedMethods?: Array<InitAuthResponseAllowedMethod> | undefined;
    message?: string | undefined;
    authProviders?: AuthProviders | undefined;
};
export declare const InitAuthResponse$zodSchema: z.ZodType<InitAuthResponse>;
//# sourceMappingURL=initauthresponse.d.ts.map