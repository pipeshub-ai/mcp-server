import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { OAuthErrorResponse } from "./oautherrorresponse.js";
/**
 * Must be "code" for authorization code grant
 */
export declare const ResponseType: {
    readonly Code: "code";
};
/**
 * Must be "code" for authorization code grant
 */
export type ResponseType = ClosedEnum<typeof ResponseType>;
export declare const ResponseType$zodSchema: z.ZodEnum<{
    code: "code";
}>;
/**
 * PKCE method (S256 recommended)
 */
export declare const OauthAuthorizeCodeChallengeMethod: {
    readonly S256: "S256";
    readonly Plain: "plain";
};
/**
 * PKCE method (S256 recommended)
 */
export type OauthAuthorizeCodeChallengeMethod = ClosedEnum<typeof OauthAuthorizeCodeChallengeMethod>;
export declare const OauthAuthorizeCodeChallengeMethod$zodSchema: z.ZodEnum<{
    S256: "S256";
    plain: "plain";
}>;
export type OauthAuthorizeRequest = {
    response_type: ResponseType;
    client_id: string;
    redirect_uri: string;
    scope: string;
    state: string;
    code_challenge?: string | undefined;
    code_challenge_method?: OauthAuthorizeCodeChallengeMethod | undefined;
    nonce?: string | undefined;
};
export declare const OauthAuthorizeRequest$zodSchema: z.ZodType<OauthAuthorizeRequest>;
export type OauthAuthorizeResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
    Result: OAuthErrorResponse;
};
export declare const OauthAuthorizeResponse$zodSchema: z.ZodType<OauthAuthorizeResponse>;
//# sourceMappingURL=oauthauthorizeop.d.ts.map