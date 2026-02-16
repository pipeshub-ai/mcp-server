import * as z from "zod";
export type Folder = {
    _key?: string | undefined;
    name: string;
    parentId?: string | undefined;
    kbId: string;
    orgId: string;
    createdAtTimestamp?: number | undefined;
    updatedAtTimestamp?: number | undefined;
    isDeleted?: boolean | undefined;
};
export declare const Folder$zodSchema: z.ZodType<Folder>;
//# sourceMappingURL=folder.d.ts.map