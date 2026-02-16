import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of AI model
 */
export declare const ModelType: {
    readonly Llm: "llm";
    readonly Embedding: "embedding";
    readonly Ocr: "ocr";
    readonly Slm: "slm";
    readonly Reasoning: "reasoning";
    readonly MultiModal: "multiModal";
};
/**
 * Type of AI model
 */
export type ModelType = ClosedEnum<typeof ModelType>;
export declare const ModelType$zodSchema: z.ZodEnum<{
    embedding: "embedding";
    llm: "llm";
    multiModal: "multiModal";
    ocr: "ocr";
    reasoning: "reasoning";
    slm: "slm";
}>;
//# sourceMappingURL=modeltype.d.ts.map