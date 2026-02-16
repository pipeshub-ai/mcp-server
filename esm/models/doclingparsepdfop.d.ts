import * as z from "zod";
export declare const DoclingParsePdfOpServerList: readonly ["http://localhost:8081"];
/**
 * Request payload
 */
export type DoclingParsePdfRequest = {
    record_name: string;
    pdf_binary: string;
};
export declare const DoclingParsePdfRequest$zodSchema: z.ZodType<DoclingParsePdfRequest>;
/**
 * PDF parsed successfully
 */
export type DoclingParsePdfResponse = {
    success?: boolean | undefined;
    parse_result?: string | undefined;
};
export declare const DoclingParsePdfResponse$zodSchema: z.ZodType<DoclingParsePdfResponse>;
//# sourceMappingURL=doclingparsepdfop.d.ts.map