import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { CitationReference } from "./citationreference.js";
import { FollowUpQuestion } from "./followupquestion.js";
import { MessageFeedback } from "./messagefeedback.js";
/**
 * Type of message:
 *
 * @remarks
 * <ul>
 * <li><code>user_query</code> - User's question or input</li>
 * <li><code>bot_response</code> - AI-generated response</li>
 * <li><code>error</code> - Error message from the system</li>
 * <li><code>feedback</code> - User feedback on a response</li>
 * <li><code>system</code> - System notification or status</li>
 * </ul>
 */
export declare const MessageType: {
    readonly UserQuery: "user_query";
    readonly BotResponse: "bot_response";
    readonly Error: "error";
    readonly Feedback: "feedback";
    readonly System: "system";
};
/**
 * Type of message:
 *
 * @remarks
 * <ul>
 * <li><code>user_query</code> - User's question or input</li>
 * <li><code>bot_response</code> - AI-generated response</li>
 * <li><code>error</code> - Error message from the system</li>
 * <li><code>feedback</code> - User feedback on a response</li>
 * <li><code>system</code> - System notification or status</li>
 * </ul>
 */
export type MessageType = ClosedEnum<typeof MessageType>;
export declare const MessageType$zodSchema: z.ZodEnum<{
    error: "error";
    bot_response: "bot_response";
    user_query: "user_query";
    feedback: "feedback";
    system: "system";
}>;
/**
 * Format of the content for rendering
 */
export declare const ContentFormat: {
    readonly Markdown: "MARKDOWN";
    readonly Json: "JSON";
    readonly Html: "HTML";
};
/**
 * Format of the content for rendering
 */
export type ContentFormat = ClosedEnum<typeof ContentFormat>;
export declare const ContentFormat$zodSchema: z.ZodEnum<{
    MARKDOWN: "MARKDOWN";
    JSON: "JSON";
    HTML: "HTML";
}>;
/**
 * AI confidence level in the response. Values come from
 *
 * @remarks
 * `CONFIDENCE_LEVELS` in
 * `enterprise_search/constants/constants.ts`.
 */
export declare const Confidence: {
    readonly High: "High";
    readonly Medium: "Medium";
    readonly Low: "Low";
    readonly VeryHigh: "Very High";
    readonly Unknown: "Unknown";
};
/**
 * AI confidence level in the response. Values come from
 *
 * @remarks
 * `CONFIDENCE_LEVELS` in
 * `enterprise_search/constants/constants.ts`.
 */
export type Confidence = ClosedEnum<typeof Confidence>;
export declare const Confidence$zodSchema: z.ZodEnum<{
    High: "High";
    Medium: "Medium";
    Low: "Low";
    "Very High": "Very High";
    Unknown: "Unknown";
}>;
export type Metadata = {
    processingTimeMs?: number | undefined;
    modelVersion?: string | undefined;
    aiTransactionId?: string | undefined;
    reason?: string | undefined;
};
export declare const Metadata$zodSchema: z.ZodType<Metadata>;
/**
 * A single message within a conversation. Messages can be user queries,
 *
 * @remarks
 * AI responses, system messages, or error notifications.
 */
export type Message = {
    _id?: string | undefined;
    messageType?: MessageType | undefined;
    content?: string | undefined;
    contentFormat?: ContentFormat | undefined;
    citations?: Array<CitationReference> | undefined;
    confidence?: Confidence | undefined;
    followUpQuestions?: Array<FollowUpQuestion> | undefined;
    feedback?: Array<MessageFeedback> | undefined;
    metadata?: Metadata | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const Message$zodSchema: z.ZodType<Message>;
//# sourceMappingURL=message.d.ts.map