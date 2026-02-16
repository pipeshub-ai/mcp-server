import * as z from "zod";
import { ConnectorConfig } from "./connectorconfig.js";
export type GetConnectorConfigRequest = {
    connectorId: string;
};
export declare const GetConnectorConfigRequest$zodSchema: z.ZodType<GetConnectorConfigRequest>;
/**
 * Configuration retrieved
 */
export type GetConnectorConfigResponse = {
    success?: boolean | undefined;
    config?: ConnectorConfig | undefined;
};
export declare const GetConnectorConfigResponse$zodSchema: z.ZodType<GetConnectorConfigResponse>;
//# sourceMappingURL=getconnectorconfigop.d.ts.map