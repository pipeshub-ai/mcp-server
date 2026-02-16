import * as z from "zod";
import { ConnectorInstance } from "./connectorinstance.js";
/**
 * Instance created
 */
export type CreateConnectorInstanceResponse = {
    success?: boolean | undefined;
    connector?: ConnectorInstance | undefined;
};
export declare const CreateConnectorInstanceResponse$zodSchema: z.ZodType<CreateConnectorInstanceResponse>;
//# sourceMappingURL=createconnectorinstanceop.d.ts.map