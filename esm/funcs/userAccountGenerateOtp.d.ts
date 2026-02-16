import { PipeshubCore } from "../core.js";
import { RequestOptions } from "../lib/sdks.js";
import { APIError } from "../models/errors/apierror.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { SDKValidationError } from "../models/errors/sdkvalidationerror.js";
import { OtpGenerateRequest } from "../models/otpgeneraterequest.js";
import { APIPromise } from "../types/async.js";
import { Result } from "../types/fp.js";
/**
 * Generate and send OTP for login
 *
 * @remarks
 * Generate and send a 6-digit one-time password (OTP) to the user's email.
 * Use this endpoint before authenticating with the <code>otp</code> method.
 * <br><br>
 * <b>OTP Details:</b><br>
 * - 6 digits numeric code<br>
 * - Valid for <b>10 minutes</b> after generation<br>
 * - Sent to user's registered email address
 * <br><br>
 * <b>Rate Limiting:</b><br>
 * - Multiple OTP requests may be rate-limited<br>
 * - Wait for the current OTP to expire before requesting a new one
 * <br><br>
 * <b>CAPTCHA:</b><br>
 * If Cloudflare Turnstile is enabled, include <code>cf-turnstile-response</code> in the request body.
 */
export declare function userAccountGenerateOtp(client$: PipeshubCore, request: OtpGenerateRequest, options?: RequestOptions): APIPromise<Result<Response, APIError | SDKValidationError | UnexpectedClientError | InvalidRequestError | RequestAbortedError | RequestTimeoutError | ConnectionError>>;
//# sourceMappingURL=userAccountGenerateOtp.d.ts.map