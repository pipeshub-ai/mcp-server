import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
import { ConnectorToggleRequest } from "./connectortogglerequest.js";
export type ToggleConnectorRequest = {
    connectorId: string;
    body: ConnectorToggleRequest;
};
export declare const ToggleConnectorRequest$zodSchema: z.ZodType<ToggleConnectorRequest>;
/**
 * Connector toggled
 */
export type ToggleConnectorResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    connector?: ConnectorInstance | undefined;
};
export declare const ToggleConnectorResponse$zodSchema: z.ZodType<ToggleConnectorResponse>;
//# sourceMappingURL=toggleconnectorop.d.ts.map