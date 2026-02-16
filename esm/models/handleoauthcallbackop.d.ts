import * as z from "zod";
export type HandleOAuthCallbackRequest = {
    code?: string | undefined;
    state?: string | undefined;
    error?: string | undefined;
    baseUrl?: string | undefined;
};
export declare const HandleOAuthCallbackRequest$zodSchema: z.ZodType<HandleOAuthCallbackRequest>;
export type HandleOAuthCallbackResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
};
export declare const HandleOAuthCallbackResponse$zodSchema: z.ZodType<HandleOAuthCallbackResponse>;
//# sourceMappingURL=handleoauthcallbackop.d.ts.map