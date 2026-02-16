import * as z from "zod";
/**
 * OpenID Connect UserInfo Response.
 *
 * @remarks
 * Contains claims about the authenticated user.
 */
export type OAuthUserInfoResponse = {
    sub: string;
    name?: string | undefined;
    given_name?: string | undefined;
    family_name?: string | undefined;
    email?: string | undefined;
    email_verified?: boolean | undefined;
    picture?: string | undefined;
    updated_at?: number | undefined;
};
export declare const OAuthUserInfoResponse$zodSchema: z.ZodType<OAuthUserInfoResponse>;
//# sourceMappingURL=oauthuserinforesponse.d.ts.map