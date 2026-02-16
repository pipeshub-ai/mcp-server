import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
/**
 * Active connectors retrieved
 */
export type ListActiveConnectorsResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorInstance> | undefined;
};
export declare const ListActiveConnectorsResponse$zodSchema: z.ZodType<ListActiveConnectorsResponse>;
//# sourceMappingURL=listactiveconnectorsop.d.ts.map