import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
export type GetConnectorInstanceRequest = {
    connectorId: string;
};
export declare const GetConnectorInstanceRequest$zodSchema: z.ZodType<GetConnectorInstanceRequest>;
/**
 * Instance retrieved
 */
export type GetConnectorInstanceResponse = {
    success?: boolean | undefined;
    connector?: ConnectorInstance | undefined;
};
export declare const GetConnectorInstanceResponse$zodSchema: z.ZodType<GetConnectorInstanceResponse>;
//# sourceMappingURL=getconnectorinstanceop.d.ts.map