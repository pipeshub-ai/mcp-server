import * as z from "zod";
import { User } from "./user.js";
export type GetUsersInGroupRequest = {
    groupId: string;
    page?: number | undefined;
    limit?: number | undefined;
};
export declare const GetUsersInGroupRequest$zodSchema: z.ZodType<GetUsersInGroupRequest>;
export type GetUsersInGroupPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
    totalPages?: number | undefined;
};
export declare const GetUsersInGroupPagination$zodSchema: z.ZodType<GetUsersInGroupPagination>;
/**
 * Users in group retrieved successfully
 */
export type GetUsersInGroupResponse = {
    success?: boolean | undefined;
    data?: Array<User> | undefined;
    pagination?: GetUsersInGroupPagination | undefined;
};
export declare const GetUsersInGroupResponse$zodSchema: z.ZodType<GetUsersInGroupResponse>;
//# sourceMappingURL=getusersingroupop.d.ts.map