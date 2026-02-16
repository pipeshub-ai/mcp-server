import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { AuthProviders } from "./authproviders.js";
/**
 * Authentication step status (for multi-step auth)
 */
export declare const AuthenticateResponseStatus: {
    readonly Success: "success";
};
/**
 * Authentication step status (for multi-step auth)
 */
export type AuthenticateResponseStatus = ClosedEnum<typeof AuthenticateResponseStatus>;
export declare const AuthenticateResponseStatus$zodSchema: z.ZodEnum<{
    success: "success";
}>;
export declare const AuthenticateResponseAllowedMethod: {
    readonly SamlSso: "samlSso";
    readonly Otp: "otp";
    readonly Password: "password";
    readonly Google: "google";
    readonly Microsoft: "microsoft";
    readonly AzureAd: "azureAd";
    readonly Oauth: "oauth";
};
export type AuthenticateResponseAllowedMethod = ClosedEnum<typeof AuthenticateResponseAllowedMethod>;
export declare const AuthenticateResponseAllowedMethod$zodSchema: z.ZodEnum<{
    password: "password";
    otp: "otp";
    samlSso: "samlSso";
    google: "google";
    microsoft: "microsoft";
    azureAd: "azureAd";
    oauth: "oauth";
}>;
/**
 * Authentication response. Two possible outcomes:
 *
 * @remarks
 * 1. **Multi-step in progress**: Returns `status: "success"` with `nextStep` and `allowedMethods`
 * 2. **Fully authenticated**: Returns `message: "Fully authenticated"` with `accessToken` and `refreshToken`
 */
export type AuthenticateResponse = {
    status?: AuthenticateResponseStatus | undefined;
    message?: string | undefined;
    nextStep?: number | undefined;
    allowedMethods?: Array<AuthenticateResponseAllowedMethod> | undefined;
    authProviders?: AuthProviders | undefined;
    accessToken?: string | undefined;
    refreshToken?: string | undefined;
};
export declare const AuthenticateResponse$zodSchema: z.ZodType<AuthenticateResponse>;
//# sourceMappingURL=authenticateresponse.d.ts.map