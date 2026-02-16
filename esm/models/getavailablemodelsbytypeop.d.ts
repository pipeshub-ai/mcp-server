import * as z from "zod";
import { ModelType } from "./modeltype.js";
export type GetAvailableModelsByTypeRequest = {
    modelType: ModelType;
};
export declare const GetAvailableModelsByTypeRequest$zodSchema: z.ZodType<GetAvailableModelsByTypeRequest>;
export type Model = {
    modelKey?: string | undefined;
    provider?: string | undefined;
    model?: string | undefined;
    isDefault?: boolean | undefined;
};
export declare const Model$zodSchema: z.ZodType<Model>;
/**
 * Available models retrieved
 */
export type GetAvailableModelsByTypeResponse = {
    models?: Array<Model> | undefined;
};
export declare const GetAvailableModelsByTypeResponse$zodSchema: z.ZodType<GetAvailableModelsByTypeResponse>;
//# sourceMappingURL=getavailablemodelsbytypeop.d.ts.map