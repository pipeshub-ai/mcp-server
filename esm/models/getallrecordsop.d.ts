import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Filter by origin (comma-separated)
 */
export declare const Origins: {
    readonly Upload: "UPLOAD";
    readonly Connector: "CONNECTOR";
};
/**
 * Filter by origin (comma-separated)
 */
export type Origins = ClosedEnum<typeof Origins>;
export declare const Origins$zodSchema: z.ZodEnum<{
    CONNECTOR: "CONNECTOR";
    UPLOAD: "UPLOAD";
}>;
export declare const GetAllRecordsSortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
export type GetAllRecordsSortOrder = ClosedEnum<typeof GetAllRecordsSortOrder>;
export declare const GetAllRecordsSortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type GetAllRecordsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    recordTypes?: string | undefined;
    origins?: Origins | undefined;
    connectors?: string | undefined;
    indexingStatus?: string | undefined;
    dateFrom?: number | undefined;
    dateTo?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: GetAllRecordsSortOrder | undefined;
};
export declare const GetAllRecordsRequest$zodSchema: z.ZodType<GetAllRecordsRequest>;
//# sourceMappingURL=getallrecordsop.d.ts.map