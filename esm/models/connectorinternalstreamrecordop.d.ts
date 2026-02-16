import * as z from "zod";
export declare const ConnectorInternalStreamRecordOpServerList: readonly ["http://localhost:8088"];
export type ConnectorInternalStreamRecordSecurity = {
    scopedToken: string;
};
export declare const ConnectorInternalStreamRecordSecurity$zodSchema: z.ZodType<ConnectorInternalStreamRecordSecurity>;
export type ConnectorInternalStreamRecordRequest = {
    record_id: string;
};
export declare const ConnectorInternalStreamRecordRequest$zodSchema: z.ZodType<ConnectorInternalStreamRecordRequest>;
//# sourceMappingURL=connectorinternalstreamrecordop.d.ts.map