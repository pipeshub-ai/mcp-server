import * as z from "zod";
import { ConnectorPagination } from "./connectorpagination.js";
import { ConnectorScope } from "./connectorscope.js";
import { ConnectorType } from "./connectortype.js";
export type GetConnectorRegistryRequest = {
    scope?: ConnectorScope | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const GetConnectorRegistryRequest$zodSchema: z.ZodType<GetConnectorRegistryRequest>;
/**
 * Connector registry retrieved
 */
export type GetConnectorRegistryResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorType> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const GetConnectorRegistryResponse$zodSchema: z.ZodType<GetConnectorRegistryResponse>;
//# sourceMappingURL=getconnectorregistryop.d.ts.map