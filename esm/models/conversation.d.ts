import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Message } from "./message.js";
/**
 * Current status of the conversation:
 *
 * @remarks
 * <ul>
 * <li><code>INPROGRESS</code> - AI is processing</li>
 * <li><code>COMPLETED</code> - Response ready</li>
 * <li><code>FAILED</code> - Error occurred</li>
 * </ul>
 */
export declare const ConversationStatus: {
    readonly Inprogress: "INPROGRESS";
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
};
/**
 * Current status of the conversation:
 *
 * @remarks
 * <ul>
 * <li><code>INPROGRESS</code> - AI is processing</li>
 * <li><code>COMPLETED</code> - Response ready</li>
 * <li><code>FAILED</code> - Error occurred</li>
 * </ul>
 */
export type ConversationStatus = ClosedEnum<typeof ConversationStatus>;
export declare const ConversationStatus$zodSchema: z.ZodEnum<{
    INPROGRESS: "INPROGRESS";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
}>;
/**
 * AI model configuration used
 */
export type ModelInfo = {
    modelKey?: string | undefined;
    modelName?: string | undefined;
    modelProvider?: string | undefined;
    chatMode?: string | undefined;
};
export declare const ModelInfo$zodSchema: z.ZodType<ModelInfo>;
export declare const ConversationAccessLevel: {
    readonly Read: "read";
    readonly Write: "write";
};
export type ConversationAccessLevel = ClosedEnum<typeof ConversationAccessLevel>;
export declare const ConversationAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    write: "write";
}>;
export type ConversationSharedWith = {
    userId?: string | undefined;
    accessLevel?: ConversationAccessLevel | undefined;
};
export declare const ConversationSharedWith$zodSchema: z.ZodType<ConversationSharedWith>;
/**
 * A conversation represents a chat session between a user and the AI.
 *
 * @remarks
 * Conversations maintain context across multiple messages and can be
 * shared, archived, and organized.
 */
export type Conversation = {
    _id?: string | undefined;
    userId?: string | undefined;
    orgId?: string | undefined;
    title?: string | undefined;
    initiator?: string | undefined;
    messages?: Array<Message> | undefined;
    status?: ConversationStatus | undefined;
    failReason?: string | undefined;
    modelInfo?: ModelInfo | undefined;
    isShared?: boolean | undefined;
    shareLink?: string | undefined;
    sharedWith?: Array<ConversationSharedWith> | undefined;
    isArchived?: boolean | undefined;
    archivedBy?: string | undefined;
    lastActivityAt?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const Conversation$zodSchema: z.ZodType<Conversation>;
//# sourceMappingURL=conversation.d.ts.map