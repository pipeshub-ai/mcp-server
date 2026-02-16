import * as z from "zod";
export type SignInViaSAMLRequest = {
    email: string;
    sessionToken?: string | undefined;
};
export declare const SignInViaSAMLRequest$zodSchema: z.ZodType<SignInViaSAMLRequest>;
export type SignInViaSAMLResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
};
export declare const SignInViaSAMLResponse$zodSchema: z.ZodType<SignInViaSAMLResponse>;
//# sourceMappingURL=signinviasamlop.d.ts.map