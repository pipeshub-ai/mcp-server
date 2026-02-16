import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * User's consent decision
 */
export declare const Consent: {
    readonly Granted: "granted";
    readonly Denied: "denied";
};
/**
 * User's consent decision
 */
export type Consent = ClosedEnum<typeof Consent>;
export declare const Consent$zodSchema: z.ZodEnum<{
    granted: "granted";
    denied: "denied";
}>;
/**
 * PKCE challenge method
 */
export declare const CodeChallengeMethod: {
    readonly S256: "S256";
    readonly Plain: "plain";
};
/**
 * PKCE challenge method
 */
export type CodeChallengeMethod = ClosedEnum<typeof CodeChallengeMethod>;
export declare const CodeChallengeMethod$zodSchema: z.ZodEnum<{
    S256: "S256";
    plain: "plain";
}>;
/**
 * Request to submit user consent for OAuth authorization
 */
export type OAuthConsentRequest = {
    client_id: string;
    redirect_uri: string;
    scope: string;
    state: string;
    consent: Consent;
    code_challenge?: string | undefined;
    code_challenge_method?: CodeChallengeMethod | undefined;
};
export declare const OAuthConsentRequest$zodSchema: z.ZodType<OAuthConsentRequest>;
//# sourceMappingURL=oauthconsentrequest.d.ts.map