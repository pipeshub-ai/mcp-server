import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const UpdateOAuthAppRequestAllowedGrantType: {
    readonly AuthorizationCode: "authorization_code";
    readonly ClientCredentials: "client_credentials";
    readonly RefreshToken: "refresh_token";
};
export type UpdateOAuthAppRequestAllowedGrantType = ClosedEnum<typeof UpdateOAuthAppRequestAllowedGrantType>;
export declare const UpdateOAuthAppRequestAllowedGrantType$zodSchema: z.ZodEnum<{
    authorization_code: "authorization_code";
    client_credentials: "client_credentials";
    refresh_token: "refresh_token";
}>;
/**
 * Request to update an OAuth app
 */
export type UpdateOAuthAppRequest = {
    name?: string | undefined;
    description?: string | undefined;
    redirectUris?: Array<string> | undefined;
    allowedGrantTypes?: Array<UpdateOAuthAppRequestAllowedGrantType> | undefined;
    allowedScopes?: Array<string> | undefined;
    homepageUrl?: string | null | undefined;
    privacyPolicyUrl?: string | null | undefined;
    termsOfServiceUrl?: string | null | undefined;
    accessTokenLifetime?: number | undefined;
    refreshTokenLifetime?: number | undefined;
};
export declare const UpdateOAuthAppRequest$zodSchema: z.ZodType<UpdateOAuthAppRequest>;
//# sourceMappingURL=updateoauthapprequest.d.ts.map