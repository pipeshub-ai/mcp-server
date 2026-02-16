import * as z from "zod";
/**
 * Google Workspace OAuth configuration for connectors
 */
export type GoogleWorkspaceOAuthConfig = {
    clientId: string;
    clientSecret: string;
    enableRealTimeUpdates?: boolean | undefined;
    topicName?: string | undefined;
};
export declare const GoogleWorkspaceOAuthConfig$zodSchema: z.ZodType<GoogleWorkspaceOAuthConfig>;
//# sourceMappingURL=googleworkspaceoauthconfig.d.ts.map