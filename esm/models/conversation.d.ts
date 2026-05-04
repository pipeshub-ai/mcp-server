import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Message } from "./message.js";
/**
 * Current status of the conversation (mixed-case values, source of
 *
 * @remarks
 * truth is `CONVERSATION_STATUS` in
 * `enterprise_search/constants/constants.ts`):
 * <ul>
 * <li><code>Inprogress</code> — request received, AI is generating a response</li>
 * <li><code>Complete</code> — response ready</li>
 * <li><code>Failed</code> — AI backend or downstream error; see <code>failReason</code></li>
 * <li><code>None</code> — placeholder used for empty/legacy conversations</li>
 * </ul>
 */
export declare const ConversationStatus: {
    readonly Complete: "Complete";
    readonly Failed: "Failed";
    readonly Inprogress: "Inprogress";
    readonly None: "None";
};
/**
 * Current status of the conversation (mixed-case values, source of
 *
 * @remarks
 * truth is `CONVERSATION_STATUS` in
 * `enterprise_search/constants/constants.ts`):
 * <ul>
 * <li><code>Inprogress</code> — request received, AI is generating a response</li>
 * <li><code>Complete</code> — response ready</li>
 * <li><code>Failed</code> — AI backend or downstream error; see <code>failReason</code></li>
 * <li><code>None</code> — placeholder used for empty/legacy conversations</li>
 * </ul>
 */
export type ConversationStatus = ClosedEnum<typeof ConversationStatus>;
export declare const ConversationStatus$zodSchema: z.ZodEnum<{
    Inprogress: "Inprogress";
    Complete: "Complete";
    Failed: "Failed";
    None: "None";
}>;
/**
 * AI model configuration used
 */
export type ModelInfo = {
    modelKey?: string | undefined;
    modelName?: string | undefined;
    modelFriendlyName?: string | undefined;
    modelProvider?: string | undefined;
    chatMode?: string | undefined;
};
export declare const ModelInfo$zodSchema: z.ZodType<ModelInfo>;
export declare const AccessLevel: {
    readonly Read: "read";
    readonly Write: "write";
};
export type AccessLevel = ClosedEnum<typeof AccessLevel>;
export declare const AccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    write: "write";
}>;
export type SharedWith = {
    userId?: string | undefined;
    accessLevel?: AccessLevel | undefined;
};
export declare const SharedWith$zodSchema: z.ZodType<SharedWith>;
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
    sharedWith?: Array<SharedWith> | undefined;
    isArchived?: boolean | undefined;
    archivedBy?: string | undefined;
    lastActivityAt?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const Conversation$zodSchema: z.ZodType<Conversation>;
//# sourceMappingURL=conversation.d.ts.map