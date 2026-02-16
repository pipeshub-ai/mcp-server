import * as z from "zod";
/**
 * Request payload
 */
export type CreateRootFolderRequestBody = {
    folderName: string;
};
export declare const CreateRootFolderRequestBody$zodSchema: z.ZodType<CreateRootFolderRequestBody>;
export type CreateRootFolderRequest = {
    kbId: string;
    body: CreateRootFolderRequestBody;
};
export declare const CreateRootFolderRequest$zodSchema: z.ZodType<CreateRootFolderRequest>;
//# sourceMappingURL=createrootfolderop.d.ts.map