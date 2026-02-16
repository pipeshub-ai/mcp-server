import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
/**
 * Inactive connectors retrieved
 */
export type ListInactiveConnectorsResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorInstance> | undefined;
};
export declare const ListInactiveConnectorsResponse$zodSchema: z.ZodType<ListInactiveConnectorsResponse>;
//# sourceMappingURL=listinactiveconnectorsop.d.ts.map