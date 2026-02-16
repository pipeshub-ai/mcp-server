import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Message } from "./message.js";
export declare const AgentConversationStatus: {
    readonly Inprogress: "INPROGRESS";
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
};
export type AgentConversationStatus = ClosedEnum<typeof AgentConversationStatus>;
export declare const AgentConversationStatus$zodSchema: z.ZodEnum<{
    INPROGRESS: "INPROGRESS";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
}>;
export declare const AgentConversationAccessLevel: {
    readonly Read: "read";
    readonly Write: "write";
};
export type AgentConversationAccessLevel = ClosedEnum<typeof AgentConversationAccessLevel>;
export declare const AgentConversationAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    write: "write";
}>;
export type AgentConversationSharedWith = {
    userId?: string | undefined;
    accessLevel?: AgentConversationAccessLevel | undefined;
};
export declare const AgentConversationSharedWith$zodSchema: z.ZodType<AgentConversationSharedWith>;
/**
 * A conversation with a specific AI agent. Similar to regular conversations
 *
 * @remarks
 * but tied to an agent's configuration and capabilities.
 */
export type AgentConversation = {
    _id?: string | undefined;
    agentKey?: string | undefined;
    userId?: string | undefined;
    orgId?: string | undefined;
    title?: string | undefined;
    messages?: Array<Message> | undefined;
    status?: AgentConversationStatus | undefined;
    isShared?: boolean | undefined;
    sharedWith?: Array<AgentConversationSharedWith> | undefined;
    lastActivityAt?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const AgentConversation$zodSchema: z.ZodType<AgentConversation>;
//# sourceMappingURL=agentconversation.d.ts.map