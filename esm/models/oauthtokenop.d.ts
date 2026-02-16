import * as z from "zod";
import { OAuthErrorResponse } from "./oautherrorresponse.js";
import { OAuthTokenResponse } from "./oauthtokenresponse.js";
export type OauthTokenResponseResponse = OAuthErrorResponse | OAuthTokenResponse;
export declare const OauthTokenResponseResponse$zodSchema: z.ZodType<OauthTokenResponseResponse>;
//# sourceMappingURL=oauthtokenop.d.ts.map