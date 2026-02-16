import * as z from "zod";
/**
 * Request payload
 */
export type CreateSubfolderRequestBody = {
    folderName: string;
};
export declare const CreateSubfolderRequestBody$zodSchema: z.ZodType<CreateSubfolderRequestBody>;
export type CreateSubfolderRequest = {
    kbId: string;
    folderId: string;
    body: CreateSubfolderRequestBody;
};
export declare const CreateSubfolderRequest$zodSchema: z.ZodType<CreateSubfolderRequest>;
//# sourceMappingURL=createsubfolderop.d.ts.map