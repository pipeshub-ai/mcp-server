import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
import { ConnectorPagination } from "./connectorpagination.js";
import { ConnectorScope } from "./connectorscope.js";
export type ListConfiguredConnectorsRequest = {
    scope?: ConnectorScope | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const ListConfiguredConnectorsRequest$zodSchema: z.ZodType<ListConfiguredConnectorsRequest>;
/**
 * Configured connectors retrieved
 */
export type ListConfiguredConnectorsResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorInstance> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const ListConfiguredConnectorsResponse$zodSchema: z.ZodType<ListConfiguredConnectorsResponse>;
//# sourceMappingURL=listconfiguredconnectorsop.d.ts.map