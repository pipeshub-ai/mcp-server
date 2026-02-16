import * as z from "zod";
import { ShareRequest } from "./sharerequest.js";
export type ShareAgentRequest = {
    agentKey: string;
    body: ShareRequest;
};
export declare const ShareAgentRequest$zodSchema: z.ZodType<ShareAgentRequest>;
//# sourceMappingURL=shareagentop.d.ts.map