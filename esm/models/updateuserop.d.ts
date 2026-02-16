import * as z from "zod";
import { Address } from "./address.js";
import { User } from "./user.js";
/**
 * Request payload
 */
export type UpdateUserRequestBody = {
    fullName?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    mobile?: string | undefined;
    designation?: string | undefined;
    address?: Address | undefined;
};
export declare const UpdateUserRequestBody$zodSchema: z.ZodType<UpdateUserRequestBody>;
export type UpdateUserRequest = {
    id: string;
    body: UpdateUserRequestBody;
};
export declare const UpdateUserRequest$zodSchema: z.ZodType<UpdateUserRequest>;
/**
 * User updated successfully
 */
export type UpdateUserResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: User | undefined;
};
export declare const UpdateUserResponse$zodSchema: z.ZodType<UpdateUserResponse>;
//# sourceMappingURL=updateuserop.d.ts.map