import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Error code. Common values:
 *
 * @remarks
 * - `invalid_request` - Missing or invalid parameter
 * - `invalid_client` - Client authentication failed
 * - `invalid_grant` - Invalid authorization code or refresh token
 * - `unauthorized_client` - Client not authorized for this grant type
 * - `unsupported_grant_type` - Grant type not supported
 * - `invalid_scope` - Requested scope is invalid or exceeds allowed
 * - `access_denied` - User denied authorization
 */
export declare const ErrorT: {
    readonly InvalidRequest: "invalid_request";
    readonly InvalidClient: "invalid_client";
    readonly InvalidGrant: "invalid_grant";
    readonly UnauthorizedClient: "unauthorized_client";
    readonly UnsupportedGrantType: "unsupported_grant_type";
    readonly InvalidScope: "invalid_scope";
    readonly AccessDenied: "access_denied";
    readonly ServerError: "server_error";
};
/**
 * Error code. Common values:
 *
 * @remarks
 * - `invalid_request` - Missing or invalid parameter
 * - `invalid_client` - Client authentication failed
 * - `invalid_grant` - Invalid authorization code or refresh token
 * - `unauthorized_client` - Client not authorized for this grant type
 * - `unsupported_grant_type` - Grant type not supported
 * - `invalid_scope` - Requested scope is invalid or exceeds allowed
 * - `access_denied` - User denied authorization
 */
export type ErrorT = ClosedEnum<typeof ErrorT>;
export declare const ErrorT$zodSchema: z.ZodEnum<{
    invalid_request: "invalid_request";
    invalid_client: "invalid_client";
    invalid_grant: "invalid_grant";
    unauthorized_client: "unauthorized_client";
    unsupported_grant_type: "unsupported_grant_type";
    invalid_scope: "invalid_scope";
    access_denied: "access_denied";
    server_error: "server_error";
}>;
/**
 * OAuth 2.0 Error Response (RFC 6749 Section 5.2).
 *
 * @remarks
 * Standard error format for OAuth endpoints.
 */
export type OAuthErrorResponse = {
    error: ErrorT;
    error_description?: string | undefined;
    error_uri?: string | undefined;
    state?: string | undefined;
};
export declare const OAuthErrorResponse$zodSchema: z.ZodType<OAuthErrorResponse>;
//# sourceMappingURL=oautherrorresponse.d.ts.map