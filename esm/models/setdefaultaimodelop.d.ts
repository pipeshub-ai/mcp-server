import * as z from "zod";
import { ModelType } from "./modeltype.js";
export type SetDefaultAIModelRequest = {
    modelType: ModelType;
    modelKey: string;
};
export declare const SetDefaultAIModelRequest$zodSchema: z.ZodType<SetDefaultAIModelRequest>;
//# sourceMappingURL=setdefaultaimodelop.d.ts.map