import * as z from "zod";
import { ConnectorSchema } from "./connectorschema.js";
export type GetConnectorSchemaRequest = {
    connectorType: string;
};
export declare const GetConnectorSchemaRequest$zodSchema: z.ZodType<GetConnectorSchemaRequest>;
/**
 * Schema retrieved
 */
export type GetConnectorSchemaResponse = {
    success?: boolean | undefined;
    schema?: ConnectorSchema | undefined;
};
export declare const GetConnectorSchemaResponse$zodSchema: z.ZodType<GetConnectorSchemaResponse>;
//# sourceMappingURL=getconnectorschemaop.d.ts.map