import * as z from "zod";
export type DeleteConnectorInstanceRequest = {
    connectorId: string;
};
export declare const DeleteConnectorInstanceRequest$zodSchema: z.ZodType<DeleteConnectorInstanceRequest>;
/**
 * Connector deleted
 */
export type DeleteConnectorInstanceResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const DeleteConnectorInstanceResponse$zodSchema: z.ZodType<DeleteConnectorInstanceResponse>;
//# sourceMappingURL=deleteconnectorinstanceop.d.ts.map