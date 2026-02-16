import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const QueryServiceChatOpServerList: readonly ["http://localhost:8000"];
export declare const QueryServiceChatRole: {
    readonly UserQuery: "user_query";
    readonly BotResponse: "bot_response";
};
export type QueryServiceChatRole = ClosedEnum<typeof QueryServiceChatRole>;
export declare const QueryServiceChatRole$zodSchema: z.ZodEnum<{
    user_query: "user_query";
    bot_response: "bot_response";
}>;
export type PreviousConversation = {
    role?: QueryServiceChatRole | undefined;
    content?: string | undefined;
};
export declare const PreviousConversation$zodSchema: z.ZodType<PreviousConversation>;
export type QueryServiceChatFilters = {};
export declare const QueryServiceChatFilters$zodSchema: z.ZodType<QueryServiceChatFilters>;
export declare const RetrievalMode: {
    readonly Hybrid: "HYBRID";
    readonly Vector: "VECTOR";
    readonly Keyword: "KEYWORD";
};
export type RetrievalMode = ClosedEnum<typeof RetrievalMode>;
export declare const RetrievalMode$zodSchema: z.ZodEnum<{
    HYBRID: "HYBRID";
    VECTOR: "VECTOR";
    KEYWORD: "KEYWORD";
}>;
export declare const ChatMode: {
    readonly Quick: "quick";
    readonly Analysis: "analysis";
    readonly DeepResearch: "deep_research";
    readonly Creative: "creative";
    readonly Precise: "precise";
    readonly Standard: "standard";
};
export type ChatMode = ClosedEnum<typeof ChatMode>;
export declare const ChatMode$zodSchema: z.ZodEnum<{
    quick: "quick";
    analysis: "analysis";
    deep_research: "deep_research";
    creative: "creative";
    precise: "precise";
    standard: "standard";
}>;
/**
 * Request payload
 */
export type QueryServiceChatRequest = {
    query: string;
    limit?: number | undefined;
    previousConversations?: Array<PreviousConversation> | undefined;
    filters?: QueryServiceChatFilters | undefined;
    retrievalMode?: RetrievalMode | undefined;
    quickMode?: boolean | undefined;
    modelKey?: string | undefined;
    modelName?: string | undefined;
    chatMode?: ChatMode | undefined;
};
export declare const QueryServiceChatRequest$zodSchema: z.ZodType<QueryServiceChatRequest>;
//# sourceMappingURL=queryservicechatop.d.ts.map