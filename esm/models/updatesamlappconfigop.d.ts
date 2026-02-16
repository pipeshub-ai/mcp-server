import * as z from "zod";
export type UpdateSamlAppConfigSecurity = {
    scopedToken: string;
};
export declare const UpdateSamlAppConfigSecurity$zodSchema: z.ZodType<UpdateSamlAppConfigSecurity>;
/**
 * Updated application configuration
 */
export type UpdateSamlAppConfigConfig = {};
export declare const UpdateSamlAppConfigConfig$zodSchema: z.ZodType<UpdateSamlAppConfigConfig>;
/**
 * Configuration reloaded successfully
 */
export type UpdateSamlAppConfigResponse = {
    message?: string | undefined;
    config?: UpdateSamlAppConfigConfig | undefined;
};
export declare const UpdateSamlAppConfigResponse$zodSchema: z.ZodType<UpdateSamlAppConfigResponse>;
//# sourceMappingURL=updatesamlappconfigop.d.ts.map