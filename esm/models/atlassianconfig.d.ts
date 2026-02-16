import * as z from "zod";
/**
 * Atlassian (Confluence/Jira) OAuth configuration
 */
export type AtlassianConfig = {
    clientId: string;
    clientSecret: string;
};
export declare const AtlassianConfig$zodSchema: z.ZodType<AtlassianConfig>;
//# sourceMappingURL=atlassianconfig.d.ts.map