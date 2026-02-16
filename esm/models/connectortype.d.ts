import * as z from "zod";
import { ConnectorAuthType } from "./connectorauthtype.js";
import { ConnectorScope } from "./connectorscope.js";
/**
 * A connector type from the registry. Represents an available integration
 *
 * @remarks
 * that can be configured as a connector instance.
 */
export type ConnectorType = {
    connectorType?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    appGroupId?: string | undefined;
    appGroup?: string | undefined;
    authTypes?: Array<ConnectorAuthType> | undefined;
    supportedScopes?: Array<ConnectorScope> | undefined;
    supportsSync?: boolean | undefined;
    supportsAgent?: boolean | undefined;
    supportsRealtime?: boolean | undefined;
    iconPath?: string | undefined;
    categories?: Array<string> | undefined;
    isBeta?: boolean | undefined;
};
export declare const ConnectorType$zodSchema: z.ZodType<ConnectorType>;
//# sourceMappingURL=connectortype.d.ts.map