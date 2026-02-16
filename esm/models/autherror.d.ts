import * as z from "zod";
/**
 * Authentication error response with details for debugging and user feedback.<br><br>
 *
 * @remarks
 * <b>Common Error Codes:</b><br>
 * <ul>
 * <li><code>INVALID_CREDENTIALS</code> - Wrong password or OTP</li>
 * <li><code>ACCOUNT_BLOCKED</code> - Account locked after 5 failed attempts</li>
 * <li><code>SESSION_EXPIRED</code> - Session token has expired</li>
 * <li><code>OTP_EXPIRED</code> - OTP code has expired (10 min validity)</li>
 * <li><code>USER_NOT_FOUND</code> - Email not registered</li>
 * <li><code>INVALID_TOKEN</code> - JWT token is invalid or malformed</li>
 * <li><code>METHOD_NOT_ALLOWED</code> - Auth method not enabled for org</li>
 * </ul>
 */
export type AuthError = {
    error?: string | undefined;
    message?: string | undefined;
    code?: string | undefined;
    statusCode?: number | undefined;
};
export declare const AuthError$zodSchema: z.ZodType<AuthError>;
//# sourceMappingURL=autherror.d.ts.map