import * as z from "zod";
import { ConnectorType } from "./connectortype.js";
export type GetOAuthConnectorTypeRequest = {
    connectorType: string;
};
export declare const GetOAuthConnectorTypeRequest$zodSchema: z.ZodType<GetOAuthConnectorTypeRequest>;
/**
 * Connector type retrieved
 */
export type GetOAuthConnectorTypeResponse = {
    success?: boolean | undefined;
    connector?: ConnectorType | undefined;
};
export declare const GetOAuthConnectorTypeResponse$zodSchema: z.ZodType<GetOAuthConnectorTypeResponse>;
//# sourceMappingURL=getoauthconnectortypeop.d.ts.map