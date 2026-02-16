import * as z from "zod";
export declare const ConnectorConvertRecordBufferOpServerList: readonly ["http://localhost:8088"];
export type ConnectorConvertRecordBufferSecurity = {
    scopedToken: string;
};
export declare const ConnectorConvertRecordBufferSecurity$zodSchema: z.ZodType<ConnectorConvertRecordBufferSecurity>;
/**
 * Request payload
 */
export type ConnectorConvertRecordBufferRequest = {
    buffer: string;
    convertTo: string;
    mimeType?: string | undefined;
};
export declare const ConnectorConvertRecordBufferRequest$zodSchema: z.ZodType<ConnectorConvertRecordBufferRequest>;
//# sourceMappingURL=connectorconvertrecordbufferop.d.ts.map