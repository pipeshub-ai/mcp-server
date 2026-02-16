import * as z from "zod";
/**
 * Request payload
 */
export type UpdateFolderRequestBody = {
    folderName: string;
};
export declare const UpdateFolderRequestBody$zodSchema: z.ZodType<UpdateFolderRequestBody>;
export type UpdateFolderRequest = {
    kbId: string;
    folderId: string;
    body: UpdateFolderRequestBody;
};
export declare const UpdateFolderRequest$zodSchema: z.ZodType<UpdateFolderRequest>;
//# sourceMappingURL=updatefolderop.d.ts.map