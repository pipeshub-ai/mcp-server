import * as z from "zod";
export type Google = {
    clientId?: string | undefined;
};
export declare const Google$zodSchema: z.ZodType<Google>;
export type Microsoft = {
    tenantId?: string | undefined;
    clientId?: string | undefined;
};
export declare const Microsoft$zodSchema: z.ZodType<Microsoft>;
export type Azuread = {
    tenantId?: string | undefined;
    clientId?: string | undefined;
};
export declare const Azuread$zodSchema: z.ZodType<Azuread>;
export type Oauth = {
    providerName?: string | undefined;
    clientId?: string | undefined;
    authorizationUrl?: string | undefined;
};
export declare const Oauth$zodSchema: z.ZodType<Oauth>;
/**
 * Configuration for external authentication providers (returned when those methods are allowed)
 */
export type AuthProviders = {
    google?: Google | undefined;
    microsoft?: Microsoft | undefined;
    azuread?: Azuread | undefined;
    oauth?: Oauth | undefined;
};
export declare const AuthProviders$zodSchema: z.ZodType<AuthProviders>;
//# sourceMappingURL=authproviders.d.ts.map