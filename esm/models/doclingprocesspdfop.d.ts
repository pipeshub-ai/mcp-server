import * as z from "zod";
export declare const DoclingProcessPdfOpServerList: readonly ["http://localhost:8081"];
/**
 * Request payload
 */
export type DoclingProcessPdfRequest = {
    record_name: string;
    pdf_binary: string;
    org_id?: string | undefined;
};
export declare const DoclingProcessPdfRequest$zodSchema: z.ZodType<DoclingProcessPdfRequest>;
/**
 * Extracted content blocks
 */
export type DoclingProcessPdfBlockContainers = {};
export declare const DoclingProcessPdfBlockContainers$zodSchema: z.ZodType<DoclingProcessPdfBlockContainers>;
/**
 * PDF processed successfully
 */
export type DoclingProcessPdfResponse = {
    success?: boolean | undefined;
    block_containers?: DoclingProcessPdfBlockContainers | undefined;
};
export declare const DoclingProcessPdfResponse$zodSchema: z.ZodType<DoclingProcessPdfResponse>;
//# sourceMappingURL=doclingprocesspdfop.d.ts.map