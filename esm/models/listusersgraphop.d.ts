import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { User } from "./user.js";
/**
 * Field to sort by
 */
export declare const ListUsersGraphSortBy: {
    readonly FullName: "fullName";
    readonly Email: "email";
    readonly CreatedAt: "createdAt";
};
/**
 * Field to sort by
 */
export type ListUsersGraphSortBy = ClosedEnum<typeof ListUsersGraphSortBy>;
export declare const ListUsersGraphSortBy$zodSchema: z.ZodEnum<{
    email: "email";
    createdAt: "createdAt";
    fullName: "fullName";
}>;
/**
 * Sort direction
 */
export declare const ListUsersGraphSortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
/**
 * Sort direction
 */
export type ListUsersGraphSortOrder = ClosedEnum<typeof ListUsersGraphSortOrder>;
export declare const ListUsersGraphSortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type ListUsersGraphRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sortBy?: ListUsersGraphSortBy | undefined;
    sortOrder?: ListUsersGraphSortOrder | undefined;
};
export declare const ListUsersGraphRequest$zodSchema: z.ZodType<ListUsersGraphRequest>;
export type ListUsersGraphPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
    totalPages?: number | undefined;
};
export declare const ListUsersGraphPagination$zodSchema: z.ZodType<ListUsersGraphPagination>;
/**
 * Paginated list of users
 */
export type ListUsersGraphResponse = {
    success?: boolean | undefined;
    data?: Array<User> | undefined;
    pagination?: ListUsersGraphPagination | undefined;
    total?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
};
export declare const ListUsersGraphResponse$zodSchema: z.ZodType<ListUsersGraphResponse>;
//# sourceMappingURL=listusersgraphop.d.ts.map