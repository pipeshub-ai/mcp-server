import * as z from "zod";
import { ConnectorFiltersConfig } from "./connectorfiltersconfig.js";
import { ConnectorSyncConfig } from "./connectorsyncconfig.js";
/**
 * Request to update filters and sync config (connector must be authenticated and inactive)
 */
export type UpdateConnectorFiltersSyncRequest = {
    sync?: ConnectorSyncConfig | undefined;
    filters?: ConnectorFiltersConfig | undefined;
    baseUrl?: string | undefined;
};
export declare const UpdateConnectorFiltersSyncRequest$zodSchema: z.ZodType<UpdateConnectorFiltersSyncRequest>;
//# sourceMappingURL=updateconnectorfilterssyncrequest.d.ts.map