import * as z from "zod";
export type CheckDocumentModifiedRequest = {
    documentId: string;
};
export declare const CheckDocumentModifiedRequest$zodSchema: z.ZodType<CheckDocumentModifiedRequest>;
/**
 * Modification check completed
 */
export type CheckDocumentModifiedResponse = {
    success?: boolean | undefined;
    isModified?: boolean | undefined;
};
export declare const CheckDocumentModifiedResponse$zodSchema: z.ZodType<CheckDocumentModifiedResponse>;
//# sourceMappingURL=checkdocumentmodifiedop.d.ts.map