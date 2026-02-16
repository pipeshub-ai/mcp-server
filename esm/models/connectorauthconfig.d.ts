import * as z from "zod";
/**
 * Authentication configuration for a connector instance
 */
export type ConnectorAuthConfig = {
    values?: {
        [k: string]: any;
    } | undefined;
    oauthConfigId?: string | undefined;
    customValues?: {
        [k: string]: any;
    } | undefined;
};
export declare const ConnectorAuthConfig$zodSchema: z.ZodType<ConnectorAuthConfig>;
//# sourceMappingURL=connectorauthconfig.d.ts.map