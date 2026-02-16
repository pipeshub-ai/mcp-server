import * as z from "zod";
import { ModelType } from "./modeltype.js";
export type DeleteAIModelProviderRequest = {
    modelType: ModelType;
    modelKey: string;
};
export declare const DeleteAIModelProviderRequest$zodSchema: z.ZodType<DeleteAIModelProviderRequest>;
//# sourceMappingURL=deleteaimodelproviderop.d.ts.map