import * as z from "zod";
import { ConnectorPagination } from "./connectorpagination.js";
import { OAuthConfig } from "./oauthconfig.js";
export type ListOAuthConfigsByTypeRequest = {
    connectorType: string;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const ListOAuthConfigsByTypeRequest$zodSchema: z.ZodType<ListOAuthConfigsByTypeRequest>;
/**
 * OAuth configurations retrieved
 */
export type ListOAuthConfigsByTypeResponse = {
    success?: boolean | undefined;
    oauthConfigs?: Array<OAuthConfig> | undefined;
    pagination?: ConnectorPagination | undefined;
};
export declare const ListOAuthConfigsByTypeResponse$zodSchema: z.ZodType<ListOAuthConfigsByTypeResponse>;
//# sourceMappingURL=listoauthconfigsbytypeop.d.ts.map