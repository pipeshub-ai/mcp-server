import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Sort order.
 */
export declare const SortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
/**
 * Sort order.
 */
export type SortOrder = ClosedEnum<typeof SortOrder>;
export declare const SortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type GetKnowledgeHubRootNodesRequest = {
    only_containers?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: SortOrder | undefined;
    q?: string | undefined;
    nodeTypes?: string | undefined;
    recordTypes?: string | undefined;
    origins?: string | undefined;
    connectorIds?: string | undefined;
    indexingStatus?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    size?: string | undefined;
    flattened?: boolean | undefined;
    include?: string | undefined;
};
export declare const GetKnowledgeHubRootNodesRequest$zodSchema: z.ZodType<GetKnowledgeHubRootNodesRequest>;
//# sourceMappingURL=getknowledgehubrootnodesop.d.ts.map