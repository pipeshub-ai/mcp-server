import * as z from "zod";
import { AuthError } from "./autherror.js";
/**
 * Authentication methods updated successfully
 */
export type UpdateAuthMethodResponseBody = {
    message?: string | undefined;
};
export declare const UpdateAuthMethodResponseBody$zodSchema: z.ZodType<UpdateAuthMethodResponseBody>;
export type UpdateAuthMethodResponse = UpdateAuthMethodResponseBody | AuthError;
export declare const UpdateAuthMethodResponse$zodSchema: z.ZodType<UpdateAuthMethodResponse>;
//# sourceMappingURL=updateauthmethodop.d.ts.map