import * as z from "zod";
export type AIModelProviderConfigConfiguration = {
    model?: string | undefined;
    apiKey?: string | undefined;
    endpoint?: string | undefined;
};
export declare const AIModelProviderConfigConfiguration$zodSchema: z.ZodType<AIModelProviderConfigConfiguration>;
export type AIModelProviderConfigInput = {
    provider: string;
    configuration: AIModelProviderConfigConfiguration;
    isMultimodal?: boolean | undefined;
    isReasoning?: boolean | undefined;
    isDefault?: boolean | undefined;
    contextLength?: number | null | undefined;
};
export declare const AIModelProviderConfigInput$zodSchema: z.ZodType<AIModelProviderConfigInput>;
export type AIModelProviderConfig = {
    provider: string;
    configuration: AIModelProviderConfigConfiguration;
    isMultimodal?: boolean | undefined;
    isReasoning?: boolean | undefined;
    isDefault?: boolean | undefined;
    contextLength?: number | null | undefined;
    modelKey?: string | undefined;
};
export declare const AIModelProviderConfig$zodSchema: z.ZodType<AIModelProviderConfig>;
//# sourceMappingURL=aimodelproviderconfiginput.d.ts.map