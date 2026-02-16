import * as z from "zod";
export type GetUserEmailByIdRequest = {
    id: string;
};
export declare const GetUserEmailByIdRequest$zodSchema: z.ZodType<GetUserEmailByIdRequest>;
/**
 * User email retrieved successfully
 */
export type GetUserEmailByIdResponse = {
    success?: boolean | undefined;
    email?: string | undefined;
};
export declare const GetUserEmailByIdResponse$zodSchema: z.ZodType<GetUserEmailByIdResponse>;
//# sourceMappingURL=getuseremailbyidop.d.ts.map