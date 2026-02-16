import * as z from "zod";
import { OAuthErrorResponse } from "./oautherrorresponse.js";
import { OAuthIntrospectResponse } from "./oauthintrospectresponse.js";
export type OauthIntrospectResponseResponse = OAuthIntrospectResponse | OAuthErrorResponse;
export declare const OauthIntrospectResponseResponse$zodSchema: z.ZodType<OauthIntrospectResponseResponse>;
//# sourceMappingURL=oauthintrospectop.d.ts.map