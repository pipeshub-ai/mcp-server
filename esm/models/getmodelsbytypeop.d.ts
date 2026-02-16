import * as z from "zod";
import { AIModelProviderConfig } from "./aimodelproviderconfiginput.js";
import { ModelType } from "./modeltype.js";
export type GetModelsByTypeRequest = {
    modelType: ModelType;
};
export declare const GetModelsByTypeRequest$zodSchema: z.ZodType<GetModelsByTypeRequest>;
/**
 * Models retrieved
 */
export type GetModelsByTypeResponse = {
    models?: Array<AIModelProviderConfig> | undefined;
};
export declare const GetModelsByTypeResponse$zodSchema: z.ZodType<GetModelsByTypeResponse>;
//# sourceMappingURL=getmodelsbytypeop.d.ts.map