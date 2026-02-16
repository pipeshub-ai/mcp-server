import * as z from "zod";
import { AuthError } from "./autherror.js";
import { OAuthExchangeResponse } from "./oauthexchangeresponse.js";
export type ExchangeOAuthCodeResponse = OAuthExchangeResponse | AuthError;
export declare const ExchangeOAuthCodeResponse$zodSchema: z.ZodType<ExchangeOAuthCodeResponse>;
//# sourceMappingURL=exchangeoauthcodeop.d.ts.map