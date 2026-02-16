import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
import { ConnectorPagination } from "./connectorpagination.js";
import { ConnectorScope } from "./connectorscope.js";
export type ListActiveAgentConnectorsRequest = {
    scope?: ConnectorScope | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const ListActiveAgentConnectorsRequest$zodSchema: z.ZodType<ListActiveAgentConnectorsRequest>;
/**
 * Active agent connectors retrieved
 */
export type ListActiveAgentConnectorsResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorInstance> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const ListActiveAgentConnectorsResponse$zodSchema: z.ZodType<ListActiveAgentConnectorsResponse>;
//# sourceMappingURL=listactiveagentconnectorsop.d.ts.map