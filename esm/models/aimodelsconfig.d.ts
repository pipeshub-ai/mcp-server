import * as z from "zod";
import { AIModelProviderConfig } from "./aimodelproviderconfiginput.js";
/**
 * Must have at least one model type configured
 */
export type AIModelsConfig = {
    ocr?: Array<AIModelProviderConfig> | undefined;
    embedding?: Array<AIModelProviderConfig> | undefined;
    slm?: Array<AIModelProviderConfig> | undefined;
    llm?: Array<AIModelProviderConfig> | undefined;
    reasoning?: Array<AIModelProviderConfig> | undefined;
    multiModal?: Array<AIModelProviderConfig> | undefined;
};
export declare const AIModelsConfig$zodSchema: z.ZodType<AIModelsConfig>;
//# sourceMappingURL=aimodelsconfig.d.ts.map