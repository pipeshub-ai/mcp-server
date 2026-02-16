import * as z from "zod";
import { ConnectorAuthType } from "./connectorauthtype.js";
import { ConnectorScope } from "./connectorscope.js";
/**
 * Authentication configuration (sensitive data redacted)
 */
export type Auth = {};
export declare const Auth$zodSchema: z.ZodType<Auth>;
/**
 * Sync configuration (schedule, options)
 */
export type ConnectorConfigSync = {};
export declare const ConnectorConfigSync$zodSchema: z.ZodType<ConnectorConfigSync>;
/**
 * Filter selections for data scope
 */
export type ConnectorConfigFilters = {};
export declare const ConnectorConfigFilters$zodSchema: z.ZodType<ConnectorConfigFilters>;
/**
 * Configuration sections
 */
export type ConnectorConfigConfig = {
    auth?: Auth | undefined;
    sync?: ConnectorConfigSync | undefined;
    filters?: ConnectorConfigFilters | undefined;
};
export declare const ConnectorConfigConfig$zodSchema: z.ZodType<ConnectorConfigConfig>;
/**
 * Configuration for a connector instance including auth, sync, and filter settings
 */
export type ConnectorConfig = {
    connectorId?: string | undefined;
    connectorType?: string | undefined;
    instanceName?: string | undefined;
    authType?: ConnectorAuthType | undefined;
    scope?: ConnectorScope | undefined;
    config?: ConnectorConfigConfig | undefined;
    baseUrl?: string | undefined;
    isActive?: boolean | undefined;
    isConfigured?: boolean | undefined;
    isAuthenticated?: boolean | undefined;
};
export declare const ConnectorConfig$zodSchema: z.ZodType<ConnectorConfig>;
//# sourceMappingURL=connectorconfig.d.ts.map