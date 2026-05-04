import * as z from "zod";
export type StreamRecordBufferRequest = {
    recordId: string;
    convertTo?: string | undefined;
};
export declare const StreamRecordBufferRequest$zodSchema: z.ZodType<StreamRecordBufferRequest>;
/**
 * Internal error or upstream stream failure. If the failure occurs
 *
 * @remarks
 * after bytes have started flowing, the connection is closed
 * mid-stream rather than returning JSON.
 */
export type StreamRecordBufferInternalServerErrorResponseBody = {
    error?: string | undefined;
};
export declare const StreamRecordBufferInternalServerErrorResponseBody$zodSchema: z.ZodType<StreamRecordBufferInternalServerErrorResponseBody>;
/**
 * Record not found.
 */
export type StreamRecordBufferNotFoundResponseBody = {
    error?: string | undefined;
};
export declare const StreamRecordBufferNotFoundResponseBody$zodSchema: z.ZodType<StreamRecordBufferNotFoundResponseBody>;
/**
 * Forbidden — the authenticated user does not have read permission
 *
 * @remarks
 * on this record's knowledge base.
 */
export type StreamRecordBufferForbiddenResponseBody = {
    error?: string | undefined;
};
export declare const StreamRecordBufferForbiddenResponseBody$zodSchema: z.ZodType<StreamRecordBufferForbiddenResponseBody>;
export type StreamRecordBufferResponseResult = Uint8Array | string | Uint8Array | string | StreamRecordBufferForbiddenResponseBody | StreamRecordBufferNotFoundResponseBody | StreamRecordBufferInternalServerErrorResponseBody;
export declare const StreamRecordBufferResponseResult$zodSchema: z.ZodType<StreamRecordBufferResponseResult>;
export type StreamRecordBufferResponse = {
    Headers: {
        [k: string]: Array<string>;
    };
    Result?: Uint8Array | string | Uint8Array | string | StreamRecordBufferForbiddenResponseBody | StreamRecordBufferNotFoundResponseBody | StreamRecordBufferInternalServerErrorResponseBody | undefined;
};
export declare const StreamRecordBufferResponse$zodSchema: z.ZodType<StreamRecordBufferResponse>;
//# sourceMappingURL=streamrecordbufferop.d.ts.map