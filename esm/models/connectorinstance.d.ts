import * as z from "zod";
import { ConnectorAuthType } from "./connectorauthtype.js";
import { ConnectorScope } from "./connectorscope.js";
/**
 * A configured connector instance. Represents an active or configured
 *
 * @remarks
 * connection to an external service.
 */
export type ConnectorInstance = {
    connectorId?: string | undefined;
    connectorType?: string | undefined;
    instanceName?: string | undefined;
    scope?: ConnectorScope | undefined;
    authType?: ConnectorAuthType | undefined;
    createdBy?: string | undefined;
    orgId?: string | undefined;
    isActive?: boolean | undefined;
    isConfigured?: boolean | undefined;
    isAuthenticated?: boolean | undefined;
    syncEnabled?: boolean | undefined;
    agentEnabled?: boolean | undefined;
    lastSyncAt?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const ConnectorInstance$zodSchema: z.ZodType<ConnectorInstance>;
//# sourceMappingURL=connectorinstance.d.ts.map