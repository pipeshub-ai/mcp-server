import * as z from "zod";
import { AuthError } from "./autherror.js";
import { RefreshTokenResponse } from "./refreshtokenresponse.js";
export type RefreshTokenSecurity = {
    scopedToken: string;
};
export declare const RefreshTokenSecurity$zodSchema: z.ZodType<RefreshTokenSecurity>;
export type RefreshTokenResponseResponse = RefreshTokenResponse | AuthError;
export declare const RefreshTokenResponseResponse$zodSchema: z.ZodType<RefreshTokenResponseResponse>;
//# sourceMappingURL=refreshtokenop.d.ts.map