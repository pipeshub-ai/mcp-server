import * as z from "zod";
import { Address } from "./address.js";
import { Organization } from "./organization.js";
/**
 * Request payload
 */
export type UpdateOrganizationRequest = {
    registeredName?: string | undefined;
    shortName?: string | undefined;
    phoneNumber?: string | undefined;
    permanentAddress?: Address | undefined;
};
export declare const UpdateOrganizationRequest$zodSchema: z.ZodType<UpdateOrganizationRequest>;
/**
 * Organization updated successfully
 */
export type UpdateOrganizationResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: Organization | undefined;
};
export declare const UpdateOrganizationResponse$zodSchema: z.ZodType<UpdateOrganizationResponse>;
//# sourceMappingURL=updateorganizationop.d.ts.map