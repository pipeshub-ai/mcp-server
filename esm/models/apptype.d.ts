import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Supported application/connector types
 */
export declare const AppType: {
    readonly Drive: "drive";
    readonly Gmail: "gmail";
    readonly Onedrive: "onedrive";
    readonly SharepointOnline: "sharepointOnline";
    readonly Bookstack: "bookstack";
    readonly Confluence: "confluence";
    readonly Jira: "jira";
    readonly Slack: "slack";
    readonly Dropbox: "dropbox";
    readonly Outlook: "outlook";
    readonly Servicenow: "servicenow";
    readonly Web: "web";
    readonly Local: "local";
};
/**
 * Supported application/connector types
 */
export type AppType = ClosedEnum<typeof AppType>;
export declare const AppType$zodSchema: z.ZodEnum<{
    drive: "drive";
    gmail: "gmail";
    onedrive: "onedrive";
    sharepointOnline: "sharepointOnline";
    bookstack: "bookstack";
    confluence: "confluence";
    jira: "jira";
    slack: "slack";
    dropbox: "dropbox";
    outlook: "outlook";
    servicenow: "servicenow";
    web: "web";
    local: "local";
}>;
//# sourceMappingURL=apptype.d.ts.map