import * as z from "zod";
/**
 * Updated provider configuration
 */
export type UpdateAIModelProviderRequestConfiguration = {};
export declare const UpdateAIModelProviderRequestConfiguration$zodSchema: z.ZodType<UpdateAIModelProviderRequestConfiguration>;
/**
 * Request to update an existing AI model provider
 */
export type UpdateAIModelProviderRequest = {
    provider: string;
    configuration: UpdateAIModelProviderRequestConfiguration;
    isMultimodal?: boolean | undefined;
    isReasoning?: boolean | undefined;
    isDefault?: boolean | undefined;
    contextLength?: number | null | undefined;
};
export declare const UpdateAIModelProviderRequest$zodSchema: z.ZodType<UpdateAIModelProviderRequest>;
//# sourceMappingURL=updateaimodelproviderrequest.d.ts.map