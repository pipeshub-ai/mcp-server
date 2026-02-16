import * as z from "zod";
/**
 * Request body for Resync connector
 */
export type ResyncConnectorRequest = {
    connectorName: string;
    connectorId: string;
};
export declare const ResyncConnectorRequest$zodSchema: z.ZodType<ResyncConnectorRequest>;
//# sourceMappingURL=resyncconnectorop.d.ts.map