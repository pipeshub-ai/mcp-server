import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export type Ratings = {
    accuracy?: number | undefined;
    relevance?: number | undefined;
    completeness?: number | undefined;
    clarity?: number | undefined;
};
export declare const Ratings$zodSchema: z.ZodType<Ratings>;
export declare const Category: {
    readonly IncorrectInformation: "incorrect_information";
    readonly MissingInformation: "missing_information";
    readonly OutdatedInformation: "outdated_information";
    readonly IrrelevantResponse: "irrelevant_response";
    readonly TooVerbose: "too_verbose";
    readonly TooBrief: "too_brief";
    readonly FormattingIssues: "formatting_issues";
    readonly CitationIssues: "citation_issues";
};
export type Category = ClosedEnum<typeof Category>;
export declare const Category$zodSchema: z.ZodEnum<{
    incorrect_information: "incorrect_information";
    missing_information: "missing_information";
    outdated_information: "outdated_information";
    irrelevant_response: "irrelevant_response";
    too_verbose: "too_verbose";
    too_brief: "too_brief";
    formatting_issues: "formatting_issues";
    citation_issues: "citation_issues";
}>;
export type Comments = {
    positive?: string | undefined;
    negative?: string | undefined;
    suggestions?: string | undefined;
};
export declare const Comments$zodSchema: z.ZodType<Comments>;
export type CitationFeedback = {
    citationId?: string | undefined;
    isRelevant?: boolean | undefined;
    relevanceScore?: number | undefined;
    comment?: string | undefined;
};
export declare const CitationFeedback$zodSchema: z.ZodType<CitationFeedback>;
/**
 * Comprehensive feedback on an AI response. Feedback helps improve
 *
 * @remarks
 * the AI's performance and response quality over time.
 */
export type MessageFeedback = {
    isHelpful?: boolean | undefined;
    ratings?: Ratings | undefined;
    categories?: Array<Category> | undefined;
    comments?: Comments | undefined;
    citationFeedback?: Array<CitationFeedback> | undefined;
    followUpQuestionsHelpful?: boolean | undefined;
};
export declare const MessageFeedback$zodSchema: z.ZodType<MessageFeedback>;
//# sourceMappingURL=messagefeedback.d.ts.map