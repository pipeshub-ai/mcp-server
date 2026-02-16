import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { ConnectorAuthConfig } from "./connectorauthconfig.js";
import { ConnectorFiltersConfig } from "./connectorfiltersconfig.js";
import { ConnectorScope } from "./connectorscope.js";
import { ConnectorSyncConfig } from "./connectorsyncconfig.js";
/**
 * Authentication type (required if connector supports multiple auth methods)
 */
export declare const AuthType: {
    readonly Oauth: "OAUTH";
    readonly OauthAdminConsent: "OAUTH_ADMIN_CONSENT";
    readonly ApiToken: "API_TOKEN";
    readonly UsernamePassword: "USERNAME_PASSWORD";
    readonly ServiceAccount: "SERVICE_ACCOUNT";
};
/**
 * Authentication type (required if connector supports multiple auth methods)
 */
export type AuthType = ClosedEnum<typeof AuthType>;
export declare const AuthType$zodSchema: z.ZodEnum<{
    OAUTH: "OAUTH";
    OAUTH_ADMIN_CONSENT: "OAUTH_ADMIN_CONSENT";
    API_TOKEN: "API_TOKEN";
    USERNAME_PASSWORD: "USERNAME_PASSWORD";
    SERVICE_ACCOUNT: "SERVICE_ACCOUNT";
}>;
/**
 * Initial configuration (can also be set after creation)
 */
export type CreateConnectorRequestConfig = {
    auth?: ConnectorAuthConfig | undefined;
    sync?: ConnectorSyncConfig | undefined;
    filters?: ConnectorFiltersConfig | undefined;
};
export declare const CreateConnectorRequestConfig$zodSchema: z.ZodType<CreateConnectorRequestConfig>;
/**
 * Request to create a new connector instance
 */
export type CreateConnectorRequest = {
    connectorType: string;
    instanceName: string;
    scope: ConnectorScope;
    authType?: AuthType | undefined;
    config?: CreateConnectorRequestConfig | undefined;
    baseUrl?: string | undefined;
};
export declare const CreateConnectorRequest$zodSchema: z.ZodType<CreateConnectorRequest>;
//# sourceMappingURL=createconnectorrequest.d.ts.map