import * as z from "zod";
export declare const ConnectorReindexFailedRecordsOpServerList: readonly ["http://localhost:8088"];
export type ConnectorReindexFailedRecordsSecurity = {
    scopedToken: string;
};
export declare const ConnectorReindexFailedRecordsSecurity$zodSchema: z.ZodType<ConnectorReindexFailedRecordsSecurity>;
/**
 * Request payload
 */
export type ConnectorReindexFailedRecordsRequest = {
    connector?: string | undefined;
};
export declare const ConnectorReindexFailedRecordsRequest$zodSchema: z.ZodType<ConnectorReindexFailedRecordsRequest>;
/**
 * Reindexing triggered
 */
export type ConnectorReindexFailedRecordsResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    count?: number | undefined;
};
export declare const ConnectorReindexFailedRecordsResponse$zodSchema: z.ZodType<ConnectorReindexFailedRecordsResponse>;
//# sourceMappingURL=connectorreindexfailedrecordsop.d.ts.map