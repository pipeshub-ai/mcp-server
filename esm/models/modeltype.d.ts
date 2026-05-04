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
    readonly ImageGeneration: "imageGeneration";
    readonly Tts: "tts";
    readonly Stt: "stt";
};
/**
 * Type of AI model
 */
export type ModelType = ClosedEnum<typeof ModelType>;
export declare const ModelType$zodSchema: z.ZodEnum<{
    llm: "llm";
    embedding: "embedding";
    ocr: "ocr";
    slm: "slm";
    reasoning: "reasoning";
    multiModal: "multiModal";
    imageGeneration: "imageGeneration";
    tts: "tts";
    stt: "stt";
}>;
//# sourceMappingURL=modeltype.d.ts.map