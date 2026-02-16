import * as z from "zod";
import { AuthError } from "./autherror.js";
/**
 * Request payload
 */
export type SamlCallbackRequest = {
    SAMLResponse: string;
    RelayState?: string | undefined;
};
export declare const SamlCallbackRequest$zodSchema: z.ZodType<SamlCallbackRequest>;
export type SamlCallbackResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
    Result: AuthError;
};
export declare const SamlCallbackResponse$zodSchema: z.ZodType<SamlCallbackResponse>;
//# sourceMappingURL=samlcallbackop.d.ts.map