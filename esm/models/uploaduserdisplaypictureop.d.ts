import * as z from "zod";
export type UploadUserDisplayPictureFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UploadUserDisplayPictureFile$zodSchema: z.ZodType<UploadUserDisplayPictureFile>;
/**
 * Request payload
 */
export type UploadUserDisplayPictureRequest = {
    file: UploadUserDisplayPictureFile | Blob;
};
export declare const UploadUserDisplayPictureRequest$zodSchema: z.ZodType<UploadUserDisplayPictureRequest>;
//# sourceMappingURL=uploaduserdisplaypictureop.d.ts.map