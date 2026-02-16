import * as z from "zod";
/**
 * AI-suggested follow-up question
 */
export type FollowUpQuestion = {
    question?: string | undefined;
    confidence?: string | undefined;
    reasoning?: string | undefined;
};
export declare const FollowUpQuestion$zodSchema: z.ZodType<FollowUpQuestion>;
//# sourceMappingURL=followupquestion.d.ts.map