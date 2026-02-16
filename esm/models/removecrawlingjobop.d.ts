import * as z from "zod";
export type RemoveCrawlingJobRequest = {
    connector: string;
    connectorId: string;
};
export declare const RemoveCrawlingJobRequest$zodSchema: z.ZodType<RemoveCrawlingJobRequest>;
/**
 * Crawling job removed successfully
 */
export type RemoveCrawlingJobResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const RemoveCrawlingJobResponse$zodSchema: z.ZodType<RemoveCrawlingJobResponse>;
//# sourceMappingURL=removecrawlingjobop.d.ts.map