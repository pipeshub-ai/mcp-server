import * as z from "zod";
import { User } from "./user.js";
/**
 * Request payload
 */
export type CreateUserRequest = {
    fullName: string;
    email: string;
    mobile?: string | undefined;
    designation?: string | undefined;
    sendInvite?: boolean | undefined;
};
export declare const CreateUserRequest$zodSchema: z.ZodType<CreateUserRequest>;
/**
 * User created successfully
 */
export type CreateUserResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: User | undefined;
    inviteSent?: boolean | undefined;
};
export declare const CreateUserResponse$zodSchema: z.ZodType<CreateUserResponse>;
//# sourceMappingURL=createuserop.d.ts.map