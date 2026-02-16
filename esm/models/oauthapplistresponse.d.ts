import * as z from "zod";
import { OAuthAppResponse } from "./oauthappresponse.js";
export type Pagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
    totalPages?: number | undefined;
};
export declare const Pagination$zodSchema: z.ZodType<Pagination>;
/**
 * Paginated list of OAuth apps
 */
export type OAuthAppListResponse = {
    data?: Array<OAuthAppResponse> | undefined;
    pagination?: Pagination | undefined;
};
export declare const OAuthAppListResponse$zodSchema: z.ZodType<OAuthAppListResponse>;
//# sourceMappingURL=oauthapplistresponse.d.ts.map