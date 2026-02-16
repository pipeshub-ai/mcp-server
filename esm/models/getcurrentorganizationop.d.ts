import * as z from "zod";
import { Organization } from "./organization.js";
/**
 * Organization details retrieved successfully
 */
export type GetCurrentOrganizationResponse = {
    success?: boolean | undefined;
    data?: Organization | undefined;
};
export declare const GetCurrentOrganizationResponse$zodSchema: z.ZodType<GetCurrentOrganizationResponse>;
//# sourceMappingURL=getcurrentorganizationop.d.ts.map