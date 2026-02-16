import * as z from "zod";
import { FilterOptions } from "./filteroptions.js";
export type GetConnectorFiltersRequest = {
    connectorId: string;
};
export declare const GetConnectorFiltersRequest$zodSchema: z.ZodType<GetConnectorFiltersRequest>;
/**
 * Filter options retrieved
 */
export type GetConnectorFiltersResponse = {
    success?: boolean | undefined;
    filterOptions?: FilterOptions | undefined;
};
export declare const GetConnectorFiltersResponse$zodSchema: z.ZodType<GetConnectorFiltersResponse>;
//# sourceMappingURL=getconnectorfiltersop.d.ts.map