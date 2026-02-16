import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Message } from "./message.js";
/**
 * Sort direction
 */
export declare const GetConversationByIdSortOrder: {
    readonly Asc: "asc";
    readonly Desc: "desc";
};
/**
 * Sort direction
 */
export type GetConversationByIdSortOrder = ClosedEnum<typeof GetConversationByIdSortOrder>;
export declare const GetConversationByIdSortOrder$zodSchema: z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>;
export type GetConversationByIdRequest = {
    conversationId: string;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: GetConversationByIdSortOrder | undefined;
};
export declare const GetConversationByIdRequest$zodSchema: z.ZodType<GetConversationByIdRequest>;
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
export declare const GetConversationByIdStatus: {
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
export type GetConversationByIdStatus = ClosedEnum<typeof GetConversationByIdStatus>;
export declare const GetConversationByIdStatus$zodSchema: z.ZodEnum<{
    INPROGRESS: "INPROGRESS";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
}>;
/**
 * AI model configuration used
 */
export type GetConversationByIdModelInfo = {
    modelKey?: string | undefined;
    modelName?: string | undefined;
    modelProvider?: string | undefined;
    chatMode?: string | undefined;
};
export declare const GetConversationByIdModelInfo$zodSchema: z.ZodType<GetConversationByIdModelInfo>;
export declare const GetConversationByIdAccessLevel: {
    readonly Read: "read";
    readonly Write: "write";
};
export type GetConversationByIdAccessLevel = ClosedEnum<typeof GetConversationByIdAccessLevel>;
export declare const GetConversationByIdAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    write: "write";
}>;
export type GetConversationByIdSharedWith = {
    userId?: string | undefined;
    accessLevel?: GetConversationByIdAccessLevel | undefined;
};
export declare const GetConversationByIdSharedWith$zodSchema: z.ZodType<GetConversationByIdSharedWith>;
export type GetConversationByIdPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    totalMessages?: number | undefined;
    totalPages?: number | undefined;
};
export declare const GetConversationByIdPagination$zodSchema: z.ZodType<GetConversationByIdPagination>;
/**
 * A conversation represents a chat session between a user and the AI.
 *
 * @remarks
 * Conversations maintain context across multiple messages and can be
 * shared, archived, and organized.
 */
export type GetConversationByIdResponse = {
    _id?: string | undefined;
    userId?: string | undefined;
    orgId?: string | undefined;
    title?: string | undefined;
    initiator?: string | undefined;
    messages?: Array<Message> | undefined;
    status?: GetConversationByIdStatus | undefined;
    failReason?: string | undefined;
    modelInfo?: GetConversationByIdModelInfo | undefined;
    isShared?: boolean | undefined;
    shareLink?: string | undefined;
    sharedWith?: Array<GetConversationByIdSharedWith> | undefined;
    isArchived?: boolean | undefined;
    archivedBy?: string | undefined;
    lastActivityAt?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    pagination?: GetConversationByIdPagination | undefined;
};
export declare const GetConversationByIdResponse$zodSchema: z.ZodType<GetConversationByIdResponse>;
//# sourceMappingURL=getconversationbyidop.d.ts.map