import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Must be "DELETE" to confirm deletion
 */
export declare const Confirm: {
    readonly Delete: "DELETE";
};
/**
 * Must be "DELETE" to confirm deletion
 */
export type Confirm = ClosedEnum<typeof Confirm>;
export declare const Confirm$zodSchema: z.ZodEnum<{
    DELETE: "DELETE";
}>;
export type DeleteOrganizationRequest = {
    confirm: Confirm;
};
export declare const DeleteOrganizationRequest$zodSchema: z.ZodType<DeleteOrganizationRequest>;
/**
 * Organization deleted successfully
 */
export type DeleteOrganizationResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const DeleteOrganizationResponse$zodSchema: z.ZodType<DeleteOrganizationResponse>;
//# sourceMappingURL=deleteorganizationop.d.ts.map