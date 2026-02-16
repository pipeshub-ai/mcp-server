import * as z from "zod";
export type CheckUserIsAdminRequest = {
    id: string;
};
export declare const CheckUserIsAdminRequest$zodSchema: z.ZodType<CheckUserIsAdminRequest>;
/**
 * User has admin access
 */
export type CheckUserIsAdminResponse = {
    success?: boolean | undefined;
    isAdmin?: boolean | undefined;
    message?: string | undefined;
    adminGroups?: Array<string> | undefined;
};
export declare const CheckUserIsAdminResponse$zodSchema: z.ZodType<CheckUserIsAdminResponse>;
//# sourceMappingURL=checkuserisadminop.d.ts.map