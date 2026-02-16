import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const GetKBRecordsSortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
export type GetKBRecordsSortOrder = ClosedEnum<typeof GetKBRecordsSortOrder>;
export declare const GetKBRecordsSortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type GetKBRecordsRequest = {
    kbId: string;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    recordTypes?: string | undefined;
    origins?: string | undefined;
    indexingStatus?: string | undefined;
    dateFrom?: number | undefined;
    dateTo?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: GetKBRecordsSortOrder | undefined;
};
export declare const GetKBRecordsRequest$zodSchema: z.ZodType<GetKBRecordsRequest>;
//# sourceMappingURL=getkbrecordsop.d.ts.map