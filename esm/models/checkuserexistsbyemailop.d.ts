import * as z from "zod";
import { User } from "./user.js";
export type CheckUserExistsByEmailSecurity = {
    scopedToken: string;
};
export declare const CheckUserExistsByEmailSecurity$zodSchema: z.ZodType<CheckUserExistsByEmailSecurity>;
export type CheckUserExistsByEmailRequest = {
    email: string;
    includeDeleted?: boolean | undefined;
};
export declare const CheckUserExistsByEmailRequest$zodSchema: z.ZodType<CheckUserExistsByEmailRequest>;
/**
 * Email check completed
 */
export type CheckUserExistsByEmailResponse = {
    success?: boolean | undefined;
    exists?: boolean | undefined;
    data?: Array<User> | undefined;
};
export declare const CheckUserExistsByEmailResponse$zodSchema: z.ZodType<CheckUserExistsByEmailResponse>;
//# sourceMappingURL=checkuserexistsbyemailop.d.ts.map