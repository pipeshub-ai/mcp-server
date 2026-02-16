import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const CreateOAuthAppRequestAllowedGrantType: {
    readonly AuthorizationCode: "authorization_code";
    readonly ClientCredentials: "client_credentials";
    readonly RefreshToken: "refresh_token";
};
export type CreateOAuthAppRequestAllowedGrantType = ClosedEnum<typeof CreateOAuthAppRequestAllowedGrantType>;
export declare const CreateOAuthAppRequestAllowedGrantType$zodSchema: z.ZodEnum<{
    authorization_code: "authorization_code";
    client_credentials: "client_credentials";
    refresh_token: "refresh_token";
}>;
/**
 * Request to create a new OAuth app
 */
export type CreateOAuthAppRequest = {
    name: string;
    description?: string | undefined;
    redirectUris: Array<string>;
    allowedGrantTypes?: Array<CreateOAuthAppRequestAllowedGrantType> | undefined;
    allowedScopes: Array<string>;
    homepageUrl?: string | undefined;
    privacyPolicyUrl?: string | undefined;
    termsOfServiceUrl?: string | undefined;
    isConfidential?: boolean | undefined;
    accessTokenLifetime?: number | undefined;
    refreshTokenLifetime?: number | undefined;
};
export declare const CreateOAuthAppRequest$zodSchema: z.ZodType<CreateOAuthAppRequest>;
//# sourceMappingURL=createoauthapprequest.d.ts.map