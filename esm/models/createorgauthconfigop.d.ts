import * as z from "zod";
import { AuthError } from "./autherror.js";
/**
 * Organization auth configuration created successfully
 */
export type CreateOrgAuthConfigResponseBody = {
    message?: string | undefined;
    orgId?: string | undefined;
    userId?: string | undefined;
};
export declare const CreateOrgAuthConfigResponseBody$zodSchema: z.ZodType<CreateOrgAuthConfigResponseBody>;
export type CreateOrgAuthConfigResponse = CreateOrgAuthConfigResponseBody | AuthError;
export declare const CreateOrgAuthConfigResponse$zodSchema: z.ZodType<CreateOrgAuthConfigResponse>;
//# sourceMappingURL=createorgauthconfigop.d.ts.map