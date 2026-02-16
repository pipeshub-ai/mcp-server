import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Document } from "./document.js";
/**
 * Default permission level for shared access
 */
export declare const UploadDocumentPermissions: {
    readonly Owner: "owner";
    readonly Editor: "editor";
    readonly Commentator: "commentator";
    readonly Readonly: "readonly";
};
/**
 * Default permission level for shared access
 */
export type UploadDocumentPermissions = ClosedEnum<typeof UploadDocumentPermissions>;
export declare const UploadDocumentPermissions$zodSchema: z.ZodEnum<{
    readonly: "readonly";
    owner: "owner";
    editor: "editor";
    commentator: "commentator";
}>;
/**
 * Enable version control for this document
 */
export declare const IsVersionedFile: {
    readonly True: "true";
    readonly False: "false";
};
/**
 * Enable version control for this document
 */
export type IsVersionedFile = ClosedEnum<typeof IsVersionedFile>;
export declare const IsVersionedFile$zodSchema: z.ZodEnum<{
    true: "true";
    false: "false";
}>;
export type UploadDocumentFile = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const UploadDocumentFile$zodSchema: z.ZodType<UploadDocumentFile>;
/**
 * Request payload
 */
export type UploadDocumentRequest = {
    documentName: string;
    documentPath?: string | undefined;
    alternateDocumentName?: string | undefined;
    permissions?: UploadDocumentPermissions | undefined;
    customMetadata?: string | undefined;
    isVersionedFile: IsVersionedFile;
    file: UploadDocumentFile | Blob;
};
export declare const UploadDocumentRequest$zodSchema: z.ZodType<UploadDocumentRequest>;
export type UploadDocumentResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
    Result: Document;
};
export declare const UploadDocumentResponse$zodSchema: z.ZodType<UploadDocumentResponse>;
//# sourceMappingURL=uploaddocumentop.d.ts.map