import * as z from "zod";
export type DeleteDocumentByIdRequest = {
    documentId: string;
};
export declare const DeleteDocumentByIdRequest$zodSchema: z.ZodType<DeleteDocumentByIdRequest>;
export type DeleteDocumentByIdData = {
    _id?: string | undefined;
    isDeleted?: boolean | undefined;
    deletedByUserId?: string | undefined;
};
export declare const DeleteDocumentByIdData$zodSchema: z.ZodType<DeleteDocumentByIdData>;
/**
 * Document deleted successfully
 */
export type DeleteDocumentByIdResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: DeleteDocumentByIdData | undefined;
};
export declare const DeleteDocumentByIdResponse$zodSchema: z.ZodType<DeleteDocumentByIdResponse>;
//# sourceMappingURL=deletedocumentbyidop.d.ts.map