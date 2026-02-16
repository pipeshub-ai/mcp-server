import * as z from "zod";
import { ConnectorConfig } from "./connectorconfig.js";
import { UpdateConnectorFiltersSyncRequest } from "./updateconnectorfilterssyncrequest.js";
export type UpdateConnectorFiltersSyncConfigRequest = {
    connectorId: string;
    body: UpdateConnectorFiltersSyncRequest;
};
export declare const UpdateConnectorFiltersSyncConfigRequest$zodSchema: z.ZodType<UpdateConnectorFiltersSyncConfigRequest>;
/**
 * Configuration updated
 */
export type UpdateConnectorFiltersSyncConfigResponse = {
    success?: boolean | undefined;
    config?: ConnectorConfig | undefined;
};
export declare const UpdateConnectorFiltersSyncConfigResponse$zodSchema: z.ZodType<UpdateConnectorFiltersSyncConfigResponse>;
//# sourceMappingURL=updateconnectorfilterssyncconfigop.d.ts.map