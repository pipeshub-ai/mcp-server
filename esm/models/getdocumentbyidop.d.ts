import * as z from "zod";
import { Document } from "./document.js";
export type GetDocumentByIdRequest = {
    documentId: string;
};
export declare const GetDocumentByIdRequest$zodSchema: z.ZodType<GetDocumentByIdRequest>;
/**
 * Document details retrieved successfully
 */
export type GetDocumentByIdResponse = {
    success?: boolean | undefined;
    data?: Document | undefined;
};
export declare const GetDocumentByIdResponse$zodSchema: z.ZodType<GetDocumentByIdResponse>;
//# sourceMappingURL=getdocumentbyidop.d.ts.map