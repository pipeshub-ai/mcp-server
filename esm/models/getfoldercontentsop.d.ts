import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const GetFolderContentsSortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
export type GetFolderContentsSortOrder = ClosedEnum<typeof GetFolderContentsSortOrder>;
export declare const GetFolderContentsSortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type GetFolderContentsRequest = {
    kbId: string;
    folderId: string;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: GetFolderContentsSortOrder | undefined;
};
export declare const GetFolderContentsRequest$zodSchema: z.ZodType<GetFolderContentsRequest>;
//# sourceMappingURL=getfoldercontentsop.d.ts.map