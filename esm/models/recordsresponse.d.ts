import * as z from "zod";
import { PaginationInfo } from "./paginationinfo.js";
import { RecordT } from "./record.js";
/**
 * Currently applied filters
 */
export type Applied = {};
export declare const Applied$zodSchema: z.ZodType<Applied>;
/**
 * Available filter options with counts
 */
export type Available = {};
export declare const Available$zodSchema: z.ZodType<Available>;
export type RecordsResponseFilters = {
    applied?: Applied | undefined;
    available?: Available | undefined;
};
export declare const RecordsResponseFilters$zodSchema: z.ZodType<RecordsResponseFilters>;
/**
 * Paginated response for records listing
 */
export type RecordsResponse = {
    records?: Array<RecordT> | undefined;
    pagination?: PaginationInfo | undefined;
    filters?: RecordsResponseFilters | undefined;
};
export declare const RecordsResponse$zodSchema: z.ZodType<RecordsResponse>;
//# sourceMappingURL=recordsresponse.d.ts.map