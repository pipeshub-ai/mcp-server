import * as z from "zod";
/**
 * Pagination information for connector lists
 */
export type ConnectorPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
    hasMore?: boolean | undefined;
};
export declare const ConnectorPagination$zodSchema: z.ZodType<ConnectorPagination>;
//# sourceMappingURL=connectorpagination.d.ts.map