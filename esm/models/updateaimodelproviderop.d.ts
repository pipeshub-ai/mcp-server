import * as z from "zod";
import { ModelType } from "./modeltype.js";
import { UpdateAIModelProviderRequest } from "./updateaimodelproviderrequest.js";
export type UpdateAIModelProviderRequestRequest = {
    modelType: ModelType;
    modelKey: string;
    body: UpdateAIModelProviderRequest;
};
export declare const UpdateAIModelProviderRequestRequest$zodSchema: z.ZodType<UpdateAIModelProviderRequestRequest>;
//# sourceMappingURL=updateaimodelproviderop.d.ts.map