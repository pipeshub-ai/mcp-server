import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
import { ConnectorPagination } from "./connectorpagination.js";
import { ConnectorScope } from "./connectorscope.js";
export type ListConnectorInstancesRequest = {
    scope?: ConnectorScope | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const ListConnectorInstancesRequest$zodSchema: z.ZodType<ListConnectorInstancesRequest>;
/**
 * Instances retrieved
 */
export type ListConnectorInstancesResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorInstance> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const ListConnectorInstancesResponse$zodSchema: z.ZodType<ListConnectorInstancesResponse>;
//# sourceMappingURL=listconnectorinstancesop.d.ts.map