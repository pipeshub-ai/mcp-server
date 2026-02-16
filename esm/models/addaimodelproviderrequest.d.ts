import * as z from "zod";
import { ModelType } from "./modeltype.js";
/**
 * Provider-specific configuration
 */
export type AddAIModelProviderRequestConfiguration = {
    model?: string | undefined;
    apiKey?: string | undefined;
    endpoint?: string | undefined;
    organizationId?: string | undefined;
    deploymentName?: string | undefined;
    awsAccessKeyId?: string | undefined;
    awsAccessSecretKey?: string | undefined;
    region?: string | undefined;
};
export declare const AddAIModelProviderRequestConfiguration$zodSchema: z.ZodType<AddAIModelProviderRequestConfiguration>;
/**
 * Request to add a new AI model provider
 */
export type AddAIModelProviderRequest = {
    modelType: ModelType;
    provider: string;
    configuration: AddAIModelProviderRequestConfiguration;
    isMultimodal?: boolean | undefined;
    isReasoning?: boolean | undefined;
    isDefault?: boolean | undefined;
    contextLength?: number | null | undefined;
};
export declare const AddAIModelProviderRequest$zodSchema: z.ZodType<AddAIModelProviderRequest>;
//# sourceMappingURL=addaimodelproviderrequest.d.ts.map