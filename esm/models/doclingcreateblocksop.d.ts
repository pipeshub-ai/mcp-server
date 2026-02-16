import * as z from "zod";
export declare const DoclingCreateBlocksOpServerList: readonly ["http://localhost:8081"];
/**
 * Request payload
 */
export type DoclingCreateBlocksRequest = {
    parse_result: string;
    page_number?: number | undefined;
};
export declare const DoclingCreateBlocksRequest$zodSchema: z.ZodType<DoclingCreateBlocksRequest>;
/**
 * Extracted content blocks
 */
export type DoclingCreateBlocksBlockContainers = {};
export declare const DoclingCreateBlocksBlockContainers$zodSchema: z.ZodType<DoclingCreateBlocksBlockContainers>;
/**
 * Blocks created successfully
 */
export type DoclingCreateBlocksResponse = {
    success?: boolean | undefined;
    block_containers?: DoclingCreateBlocksBlockContainers | undefined;
};
export declare const DoclingCreateBlocksResponse$zodSchema: z.ZodType<DoclingCreateBlocksResponse>;
//# sourceMappingURL=doclingcreateblocksop.d.ts.map