import * as z from "zod";
import { Filters } from "./filters.js";
/**
 * Request body for adding a message to an existing conversation
 */
export type AddMessageRequest = {
    query: string;
    filters?: Filters | undefined;
    modelKey?: string | undefined;
    modelName?: string | undefined;
    chatMode?: string | undefined;
};
export declare const AddMessageRequest$zodSchema: z.ZodType<AddMessageRequest>;
//# sourceMappingURL=addmessagerequest.d.ts.map