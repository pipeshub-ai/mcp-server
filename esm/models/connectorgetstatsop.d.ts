import * as z from "zod";
export declare const ConnectorGetStatsOpServerList: readonly ["http://localhost:8088"];
export type ConnectorGetStatsSecurity = {
    scopedToken: string;
};
export declare const ConnectorGetStatsSecurity$zodSchema: z.ZodType<ConnectorGetStatsSecurity>;
export type ConnectorGetStatsRequest = {
    org_id: string;
    connector: string;
};
export declare const ConnectorGetStatsRequest$zodSchema: z.ZodType<ConnectorGetStatsRequest>;
/**
 * Connector statistics
 */
export type ConnectorGetStatsResponse = {
    totalRecords?: number | undefined;
    indexedRecords?: number | undefined;
    failedRecords?: number | undefined;
    pendingRecords?: number | undefined;
    lastSyncTimestamp?: number | undefined;
};
export declare const ConnectorGetStatsResponse$zodSchema: z.ZodType<ConnectorGetStatsResponse>;
//# sourceMappingURL=connectorgetstatsop.d.ts.map