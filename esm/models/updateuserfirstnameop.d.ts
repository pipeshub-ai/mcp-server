import * as z from "zod";
import { User } from "./user.js";
/**
 * Request payload
 */
export type UpdateUserFirstNameRequestBody = {
    firstName: string;
};
export declare const UpdateUserFirstNameRequestBody$zodSchema: z.ZodType<UpdateUserFirstNameRequestBody>;
export type UpdateUserFirstNameRequest = {
    id: string;
    body: UpdateUserFirstNameRequestBody;
};
export declare const UpdateUserFirstNameRequest$zodSchema: z.ZodType<UpdateUserFirstNameRequest>;
/**
 * First name updated successfully
 */
export type UpdateUserFirstNameResponse = {
    success?: boolean | undefined;
    data?: User | undefined;
};
export declare const UpdateUserFirstNameResponse$zodSchema: z.ZodType<UpdateUserFirstNameResponse>;
//# sourceMappingURL=updateuserfirstnameop.d.ts.map