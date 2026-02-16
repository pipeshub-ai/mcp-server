import * as z from "zod";
import { UserBasic } from "./userbasic.js";
/**
 * Response with new access token
 */
export type RefreshTokenResponse = {
    user?: UserBasic | undefined;
    accessToken?: string | undefined;
};
export declare const RefreshTokenResponse$zodSchema: z.ZodType<RefreshTokenResponse>;
//# sourceMappingURL=refreshtokenresponse.d.ts.map