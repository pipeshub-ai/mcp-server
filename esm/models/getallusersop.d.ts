import * as z from "zod";
import { User } from "./user.js";
export type GetAllUsersRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const GetAllUsersRequest$zodSchema: z.ZodType<GetAllUsersRequest>;
export type GetAllUsersPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
    totalPages?: number | undefined;
};
export declare const GetAllUsersPagination$zodSchema: z.ZodType<GetAllUsersPagination>;
/**
 * List of users retrieved successfully
 */
export type GetAllUsersResponse = {
    success?: boolean | undefined;
    data?: Array<User> | undefined;
    pagination?: GetAllUsersPagination | undefined;
};
export declare const GetAllUsersResponse$zodSchema: z.ZodType<GetAllUsersResponse>;
//# sourceMappingURL=getallusersop.d.ts.map