import * as z from "zod";
import { ConnectorAuthConfig } from "./connectorauthconfig.js";
/**
 * Request to update authentication config (clears OAuth tokens, requires re-auth)
 */
export type UpdateConnectorAuthRequest = {
    auth: ConnectorAuthConfig;
    baseUrl?: string | undefined;
};
export declare const UpdateConnectorAuthRequest$zodSchema: z.ZodType<UpdateConnectorAuthRequest>;
//# sourceMappingURL=updateconnectorauthrequest.d.ts.map