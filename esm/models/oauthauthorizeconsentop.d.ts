import * as z from "zod";
import { OAuthErrorResponse } from "./oautherrorresponse.js";
/**
 * Consent processed, returns redirect URL with authorization code
 */
export type OauthAuthorizeConsentResponseBody = {
    redirect_uri?: string | undefined;
};
export declare const OauthAuthorizeConsentResponseBody$zodSchema: z.ZodType<OauthAuthorizeConsentResponseBody>;
export type OauthAuthorizeConsentResponse = OAuthErrorResponse | OauthAuthorizeConsentResponseBody;
export declare const OauthAuthorizeConsentResponse$zodSchema: z.ZodType<OauthAuthorizeConsentResponse>;
//# sourceMappingURL=oauthauthorizeconsentop.d.ts.map