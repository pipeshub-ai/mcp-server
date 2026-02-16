import * as z from "zod";
import { AuthError } from "./autherror.js";
import { PasswordResetResponse } from "./passwordresetresponse.js";
export type ResetPasswordWithTokenSecurity = {
    scopedToken: string;
};
export declare const ResetPasswordWithTokenSecurity$zodSchema: z.ZodType<ResetPasswordWithTokenSecurity>;
export type ResetPasswordWithTokenResponse = PasswordResetResponse | AuthError;
export declare const ResetPasswordWithTokenResponse$zodSchema: z.ZodType<ResetPasswordWithTokenResponse>;
//# sourceMappingURL=resetpasswordwithtokenop.d.ts.map