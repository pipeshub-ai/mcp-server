import * as z from "zod";
import { AuthenticateRequest } from "./authenticaterequest.js";
import { AuthenticateResponse } from "./authenticateresponse.js";
import { AuthError } from "./autherror.js";
export type AuthenticateRequestRequest = {
    xSessionToken: string;
    body: AuthenticateRequest;
};
export declare const AuthenticateRequestRequest$zodSchema: z.ZodType<AuthenticateRequestRequest>;
export type AuthenticateResponseResponse = AuthenticateResponse | AuthError;
export declare const AuthenticateResponseResponse$zodSchema: z.ZodType<AuthenticateResponseResponse>;
//# sourceMappingURL=authenticateop.d.ts.map