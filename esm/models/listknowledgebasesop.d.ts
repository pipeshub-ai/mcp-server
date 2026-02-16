import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { KnowledgeBase } from "./knowledgebase.js";
import { PaginationInfo } from "./paginationinfo.js";
/**
 * Field to sort by
 */
export declare const ListKnowledgeBasesSortBy: {
    readonly Name: "name";
    readonly CreatedAtTimestamp: "createdAtTimestamp";
    readonly UpdatedAtTimestamp: "updatedAtTimestamp";
    readonly UserRole: "userRole";
};
/**
 * Field to sort by
 */
export type ListKnowledgeBasesSortBy = ClosedEnum<typeof ListKnowledgeBasesSortBy>;
export declare const ListKnowledgeBasesSortBy$zodSchema: z.ZodEnum<{
    name: "name";
    createdAtTimestamp: "createdAtTimestamp";
    updatedAtTimestamp: "updatedAtTimestamp";
    userRole: "userRole";
}>;
/**
 * Sort direction
 */
export declare const ListKnowledgeBasesSortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
/**
 * Sort direction
 */
export type ListKnowledgeBasesSortOrder = ClosedEnum<typeof ListKnowledgeBasesSortOrder>;
export declare const ListKnowledgeBasesSortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type ListKnowledgeBasesRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    permissions?: string | undefined;
    sortBy?: ListKnowledgeBasesSortBy | undefined;
    sortOrder?: ListKnowledgeBasesSortOrder | undefined;
};
export declare const ListKnowledgeBasesRequest$zodSchema: z.ZodType<ListKnowledgeBasesRequest>;
/**
 * Successful operation
 */
export type ListKnowledgeBasesResponse = {
    knowledgeBases?: Array<KnowledgeBase> | undefined;
    pagination?: PaginationInfo | undefined;
};
export declare const ListKnowledgeBasesResponse$zodSchema: z.ZodType<ListKnowledgeBasesResponse>;
//# sourceMappingURL=listknowledgebasesop.d.ts.map