import * as z from "zod";
import { ConnectorPagination } from "./connectorpagination.js";
import { OAuthConfig } from "./oauthconfig.js";
export type ListOAuthConfigsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const ListOAuthConfigsRequest$zodSchema: z.ZodType<ListOAuthConfigsRequest>;
/**
 * OAuth configurations retrieved
 */
export type ListOAuthConfigsResponse = {
    success?: boolean | undefined;
    oauthConfigs?: Array<OAuthConfig> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const ListOAuthConfigsResponse$zodSchema: z.ZodType<ListOAuthConfigsResponse>;
//# sourceMappingURL=listoauthconfigsop.d.ts.map