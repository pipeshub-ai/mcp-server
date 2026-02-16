import * as z from "zod";
/**
 * Authorization code from Google OAuth consent
 */
export type GetTokenFromCodeRequest = {
    code: string;
};
export declare const GetTokenFromCodeRequest$zodSchema: z.ZodType<GetTokenFromCodeRequest>;
/**
 * Tokens exchanged and stored successfully
 */
export type GetTokenFromCodeResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const GetTokenFromCodeResponse$zodSchema: z.ZodType<GetTokenFromCodeResponse>;
//# sourceMappingURL=gettokenfromcodeop.d.ts.map