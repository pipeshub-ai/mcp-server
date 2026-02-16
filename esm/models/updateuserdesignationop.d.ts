import * as z from "zod";
import { User } from "./user.js";
/**
 * Request payload
 */
export type UpdateUserDesignationRequestBody = {
    designation: string;
};
export declare const UpdateUserDesignationRequestBody$zodSchema: z.ZodType<UpdateUserDesignationRequestBody>;
export type UpdateUserDesignationRequest = {
    id: string;
    body: UpdateUserDesignationRequestBody;
};
export declare const UpdateUserDesignationRequest$zodSchema: z.ZodType<UpdateUserDesignationRequest>;
/**
 * Designation updated successfully
 */
export type UpdateUserDesignationResponse = {
    success?: boolean | undefined;
    data?: User | undefined;
};
export declare const UpdateUserDesignationResponse$zodSchema: z.ZodType<UpdateUserDesignationResponse>;
//# sourceMappingURL=updateuserdesignationop.d.ts.map