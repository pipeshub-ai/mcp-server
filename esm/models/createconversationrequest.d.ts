import * as z from "zod";
import { Filters } from "./filters.js";
/**
 * Request body for creating a new AI conversation.<br><br>
 *
 * @remarks
 * <b>Query Processing:</b><br>
 * The query is processed through PipesHub's AI pipeline which:
 * <ul>
 * <li>Performs semantic search across indexed knowledge bases</li>
 * <li>Retrieves relevant context from matching documents</li>
 * <li>Generates a response with citations to source materials</li>
 * <li>Suggests follow-up questions based on the conversation</li>
 * </ul>
 */
export type CreateConversationRequest = {
    query: string;
    recordIds?: Array<string> | undefined;
    departments?: Array<string> | undefined;
    filters?: Filters | undefined;
    modelKey?: string | undefined;
    modelName?: string | undefined;
    chatMode?: string | undefined;
};
export declare const CreateConversationRequest$zodSchema: z.ZodType<CreateConversationRequest>;
//# sourceMappingURL=createconversationrequest.d.ts.map