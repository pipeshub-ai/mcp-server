import * as z from "zod";
import { ConnectorAuthConfig } from "./connectorauthconfig.js";
import { ConnectorFiltersConfig } from "./connectorfiltersconfig.js";
import { ConnectorSyncConfig } from "./connectorsyncconfig.js";
/**
 * Request to update connector configuration (partial updates supported)
 */
export type UpdateConnectorConfigRequest = {
    auth?: ConnectorAuthConfig | undefined;
    sync?: ConnectorSyncConfig | undefined;
    filters?: ConnectorFiltersConfig | undefined;
    baseUrl?: string | undefined;
};
export declare const UpdateConnectorConfigRequest$zodSchema: z.ZodType<UpdateConnectorConfigRequest>;
//# sourceMappingURL=updateconnectorconfigrequest.d.ts.map