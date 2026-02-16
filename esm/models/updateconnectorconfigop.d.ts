import * as z from "zod";
import { ConnectorConfig } from "./connectorconfig.js";
import { UpdateConnectorConfigRequest } from "./updateconnectorconfigrequest.js";
export type UpdateConnectorConfigRequestRequest = {
    connectorId: string;
    body: UpdateConnectorConfigRequest;
};
export declare const UpdateConnectorConfigRequestRequest$zodSchema: z.ZodType<UpdateConnectorConfigRequestRequest>;
/**
 * Configuration updated
 */
export type UpdateConnectorConfigResponse = {
    success?: boolean | undefined;
    config?: ConnectorConfig | undefined;
};
export declare const UpdateConnectorConfigResponse$zodSchema: z.ZodType<UpdateConnectorConfigResponse>;
//# sourceMappingURL=updateconnectorconfigop.d.ts.map