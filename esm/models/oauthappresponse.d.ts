import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * App status
 */
export declare const OAuthAppResponseStatus: {
    readonly Active: "active";
    readonly Suspended: "suspended";
    readonly Revoked: "revoked";
};
/**
 * App status
 */
export type OAuthAppResponseStatus = ClosedEnum<typeof OAuthAppResponseStatus>;
export declare const OAuthAppResponseStatus$zodSchema: z.ZodEnum<{
    active: "active";
    suspended: "suspended";
    revoked: "revoked";
}>;
/**
 * OAuth app details (without secret)
 */
export type OAuthAppResponse = {
    id?: string | undefined;
    slug?: string | undefined;
    clientId?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    redirectUris?: Array<string> | undefined;
    allowedGrantTypes?: Array<string> | undefined;
    allowedScopes?: Array<string> | undefined;
    status?: OAuthAppResponseStatus | undefined;
    logoUrl?: string | undefined;
    homepageUrl?: string | undefined;
    privacyPolicyUrl?: string | undefined;
    termsOfServiceUrl?: string | undefined;
    isConfidential?: boolean | undefined;
    accessTokenLifetime?: number | undefined;
    refreshTokenLifetime?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const OAuthAppResponse$zodSchema: z.ZodType<OAuthAppResponse>;
//# sourceMappingURL=oauthappresponse.d.ts.map