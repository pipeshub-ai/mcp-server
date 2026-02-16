import * as z from "zod";
export type CheckPasswordStatusSecurity = {
    scopedToken: string;
};
export declare const CheckPasswordStatusSecurity$zodSchema: z.ZodType<CheckPasswordStatusSecurity>;
/**
 * Password status retrieved
 */
export type CheckPasswordStatusResponse = {
    hasPassword?: boolean | undefined;
};
export declare const CheckPasswordStatusResponse$zodSchema: z.ZodType<CheckPasswordStatusResponse>;
//# sourceMappingURL=checkpasswordstatusop.d.ts.map