import * as z from "zod";
import { AuthError } from "./autherror.js";
import { PasswordResetResponse } from "./passwordresetresponse.js";
export type ResetPasswordResponse = PasswordResetResponse | AuthError;
export declare const ResetPasswordResponse$zodSchema: z.ZodType<ResetPasswordResponse>;
//# sourceMappingURL=resetpasswordop.d.ts.map