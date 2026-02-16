import * as z from "zod";
export type DeleteUserRequest = {
    id: string;
};
export declare const DeleteUserRequest$zodSchema: z.ZodType<DeleteUserRequest>;
export type DeletedUser = {
    _id?: string | undefined;
    fullName?: string | undefined;
    email?: string | undefined;
};
export declare const DeletedUser$zodSchema: z.ZodType<DeletedUser>;
/**
 * User deleted successfully
 */
export type DeleteUserResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    deletedUser?: DeletedUser | undefined;
};
export declare const DeleteUserResponse$zodSchema: z.ZodType<DeleteUserResponse>;
//# sourceMappingURL=deleteuserop.d.ts.map