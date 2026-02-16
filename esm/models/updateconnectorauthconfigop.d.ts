import * as z from "zod";
import { ConnectorConfig } from "./connectorconfig.js";
import { UpdateConnectorAuthRequest } from "./updateconnectorauthrequest.js";
export type UpdateConnectorAuthConfigRequest = {
    connectorId: string;
    body: UpdateConnectorAuthRequest;
};
export declare const UpdateConnectorAuthConfigRequest$zodSchema: z.ZodType<UpdateConnectorAuthConfigRequest>;
/**
 * Auth configuration updated
 */
export type UpdateConnectorAuthConfigResponse = {
    success?: boolean | undefined;
    config?: ConnectorConfig | undefined;
};
export declare const UpdateConnectorAuthConfigResponse$zodSchema: z.ZodType<UpdateConnectorAuthConfigResponse>;
//# sourceMappingURL=updateconnectorauthconfigop.d.ts.map