import * as z from "zod";
import { ConnectorPagination } from "./connectorpagination.js";
import { ConnectorType } from "./connectortype.js";
export type GetOAuthRegistryRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const GetOAuthRegistryRequest$zodSchema: z.ZodType<GetOAuthRegistryRequest>;
/**
 * OAuth connector types retrieved
 */
export type GetOAuthRegistryResponse = {
    success?: boolean | undefined;
    connectors?: Array<ConnectorType> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const GetOAuthRegistryResponse$zodSchema: z.ZodType<GetOAuthRegistryResponse>;
//# sourceMappingURL=getoauthregistryop.d.ts.map