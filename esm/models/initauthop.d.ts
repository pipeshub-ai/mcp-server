import * as z from "zod";
import { AuthError } from "./autherror.js";
import { InitAuthResponse } from "./initauthresponse.js";
export type InitAuthResponseResult = InitAuthResponse | AuthError;
export declare const InitAuthResponseResult$zodSchema: z.ZodType<InitAuthResponseResult>;
export type InitAuthResponseResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
    Result: InitAuthResponse | AuthError;
};
export declare const InitAuthResponseResponse$zodSchema: z.ZodType<InitAuthResponseResponse>;
//# sourceMappingURL=initauthop.d.ts.map