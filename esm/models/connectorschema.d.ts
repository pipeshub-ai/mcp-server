import * as z from "zod";
/**
 * JSON Schema for authentication fields
 */
export type AuthSchema = {};
export declare const AuthSchema$zodSchema: z.ZodType<AuthSchema>;
/**
 * JSON Schema for sync configuration
 */
export type SyncSchema = {};
export declare const SyncSchema$zodSchema: z.ZodType<SyncSchema>;
/**
 * JSON Schema for filter options
 */
export type FilterSchema = {};
export declare const FilterSchema$zodSchema: z.ZodType<FilterSchema>;
/**
 * Schema definition for configuring a connector type
 */
export type ConnectorSchema = {
    connectorType?: string | undefined;
    authSchema?: AuthSchema | undefined;
    syncSchema?: SyncSchema | undefined;
    filterSchema?: FilterSchema | undefined;
    requiredFields?: Array<string> | undefined;
};
export declare const ConnectorSchema$zodSchema: z.ZodType<ConnectorSchema>;
//# sourceMappingURL=connectorschema.d.ts.map