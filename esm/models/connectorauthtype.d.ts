import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Authentication method required by the connector:<br>
 *
 * @remarks
 * <ul>
 * <li><code>OAUTH</code> - User OAuth consent flow</li>
 * <li><code>OAUTH_ADMIN_CONSENT</code> - Admin OAuth with org-wide consent</li>
 * <li><code>API_TOKEN</code> - API key or token authentication</li>
 * <li><code>USERNAME_PASSWORD</code> - Username/password credentials</li>
 * <li><code>NONE</code> - No authentication required</li>
 * </ul>
 */
export declare const ConnectorAuthType: {
    readonly Oauth: "OAUTH";
    readonly OauthAdminConsent: "OAUTH_ADMIN_CONSENT";
    readonly ApiToken: "API_TOKEN";
    readonly UsernamePassword: "USERNAME_PASSWORD";
    readonly None: "NONE";
};
/**
 * Authentication method required by the connector:<br>
 *
 * @remarks
 * <ul>
 * <li><code>OAUTH</code> - User OAuth consent flow</li>
 * <li><code>OAUTH_ADMIN_CONSENT</code> - Admin OAuth with org-wide consent</li>
 * <li><code>API_TOKEN</code> - API key or token authentication</li>
 * <li><code>USERNAME_PASSWORD</code> - Username/password credentials</li>
 * <li><code>NONE</code> - No authentication required</li>
 * </ul>
 */
export type ConnectorAuthType = ClosedEnum<typeof ConnectorAuthType>;
export declare const ConnectorAuthType$zodSchema: z.ZodEnum<{
    OAUTH: "OAUTH";
    OAUTH_ADMIN_CONSENT: "OAUTH_ADMIN_CONSENT";
    API_TOKEN: "API_TOKEN";
    USERNAME_PASSWORD: "USERNAME_PASSWORD";
    NONE: "NONE";
}>;
//# sourceMappingURL=connectorauthtype.d.ts.map