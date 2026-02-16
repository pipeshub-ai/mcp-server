import * as z from "zod";
/**
 * Credentials for OAuth authentication (Microsoft, Azure AD, generic OAuth)
 */
export type OAuthCredentials = {
    accessToken: string;
    idToken?: string | undefined;
};
export declare const OAuthCredentials$zodSchema: z.ZodType<OAuthCredentials>;
//# sourceMappingURL=oauthcredentials.d.ts.map