import * as z from "zod";
import { User } from "./user.js";
/**
 * Request payload
 */
export type UpdateUserLastNameRequestBody = {
    lastName: string;
};
export declare const UpdateUserLastNameRequestBody$zodSchema: z.ZodType<UpdateUserLastNameRequestBody>;
export type UpdateUserLastNameRequest = {
    id: string;
    body: UpdateUserLastNameRequestBody;
};
export declare const UpdateUserLastNameRequest$zodSchema: z.ZodType<UpdateUserLastNameRequest>;
/**
 * Last name updated successfully
 */
export type UpdateUserLastNameResponse = {
    success?: boolean | undefined;
    data?: User | undefined;
};
export declare const UpdateUserLastNameResponse$zodSchema: z.ZodType<UpdateUserLastNameResponse>;
//# sourceMappingURL=updateuserlastnameop.d.ts.map