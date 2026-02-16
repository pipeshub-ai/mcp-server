import * as z from "zod";
import { AIModelProviderConfigInput } from "./aimodelproviderconfiginput.js";
/**
 * Must have at least one model type configured
 */
export type AIModelsConfigInput = {
    ocr?: Array<AIModelProviderConfigInput> | undefined;
    embedding?: Array<AIModelProviderConfigInput> | undefined;
    slm?: Array<AIModelProviderConfigInput> | undefined;
    llm?: Array<AIModelProviderConfigInput> | undefined;
    reasoning?: Array<AIModelProviderConfigInput> | undefined;
    multiModal?: Array<AIModelProviderConfigInput> | undefined;
};
export declare const AIModelsConfigInput$zodSchema: z.ZodType<AIModelsConfigInput>;
//# sourceMappingURL=aimodelsconfiginput.d.ts.map