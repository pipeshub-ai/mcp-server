import * as z from "zod";
/**
 * Statistics for a connector's records
 */
export type ConnectorStats = {
    connectorId?: string | undefined;
    totalRecords?: number | undefined;
    indexedRecords?: number | undefined;
    failedRecords?: number | undefined;
    pendingRecords?: number | undefined;
    lastSyncTime?: number | undefined;
    statusBreakdown?: {
        [k: string]: number;
    } | undefined;
};
export declare const ConnectorStats$zodSchema: z.ZodType<ConnectorStats>;
//# sourceMappingURL=connectorstats.d.ts.map