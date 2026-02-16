import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
import { UpdateConnectorNameRequest } from "./updateconnectornamerequest.js";
export type UpdateConnectorNameRequestRequest = {
    connectorId: string;
    body: UpdateConnectorNameRequest;
};
export declare const UpdateConnectorNameRequestRequest$zodSchema: z.ZodType<UpdateConnectorNameRequestRequest>;
/**
 * Name updated
 */
export type UpdateConnectorNameResponse = {
    success?: boolean | undefined;
    connector?: ConnectorInstance | undefined;
};
export declare const UpdateConnectorNameResponse$zodSchema: z.ZodType<UpdateConnectorNameResponse>;
//# sourceMappingURL=updateconnectornameop.d.ts.map