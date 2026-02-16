import * as z from "zod";
/**
 * Request body for Revoke agent access
 */
export type UnshareAgentRequestBody = {
    userIds: Array<string>;
};
export declare const UnshareAgentRequestBody$zodSchema: z.ZodType<UnshareAgentRequestBody>;
export type UnshareAgentRequest = {
    agentKey: string;
    body: UnshareAgentRequestBody;
};
export declare const UnshareAgentRequest$zodSchema: z.ZodType<UnshareAgentRequest>;
//# sourceMappingURL=unshareagentop.d.ts.map