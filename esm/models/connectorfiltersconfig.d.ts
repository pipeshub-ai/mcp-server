import * as z from "zod";
/**
 * Sync filter selections
 */
export type ConnectorFiltersConfigSync = {
    values?: {
        [k: string]: any;
    } | undefined;
};
export declare const ConnectorFiltersConfigSync$zodSchema: z.ZodType<ConnectorFiltersConfigSync>;
/**
 * Indexing filter selections
 */
export type Indexing = {
    values?: {
        [k: string]: any;
    } | undefined;
};
export declare const Indexing$zodSchema: z.ZodType<Indexing>;
/**
 * Filter configuration to control what data is synced (sync filters and indexing filters)
 */
export type ConnectorFiltersConfig = {
    sync?: ConnectorFiltersConfigSync | undefined;
    indexing?: Indexing | undefined;
};
export declare const ConnectorFiltersConfig$zodSchema: z.ZodType<ConnectorFiltersConfig>;
//# sourceMappingURL=connectorfiltersconfig.d.ts.map