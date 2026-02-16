import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Toggle type: 'sync' for data synchronization, 'agent' for AI agent integration
 */
export declare const ConnectorToggleRequestType: {
    readonly Sync: "sync";
    readonly Agent: "agent";
};
/**
 * Toggle type: 'sync' for data synchronization, 'agent' for AI agent integration
 */
export type ConnectorToggleRequestType = ClosedEnum<typeof ConnectorToggleRequestType>;
export declare const ConnectorToggleRequestType$zodSchema: z.ZodEnum<{
    sync: "sync";
    agent: "agent";
}>;
/**
 * Request to toggle connector active status
 */
export type ConnectorToggleRequest = {
    type: ConnectorToggleRequestType;
};
export declare const ConnectorToggleRequest$zodSchema: z.ZodType<ConnectorToggleRequest>;
//# sourceMappingURL=connectortogglerequest.d.ts.map