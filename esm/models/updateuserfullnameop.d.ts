import * as z from "zod";
/**
 * Request payload
 */
export type UpdateUserFullNameRequestBody = {
    fullName: string;
};
export declare const UpdateUserFullNameRequestBody$zodSchema: z.ZodType<UpdateUserFullNameRequestBody>;
export type UpdateUserFullNameRequest = {
    id: string;
    body: UpdateUserFullNameRequestBody;
};
export declare const UpdateUserFullNameRequest$zodSchema: z.ZodType<UpdateUserFullNameRequest>;
//# sourceMappingURL=updateuserfullnameop.d.ts.map