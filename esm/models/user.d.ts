import * as z from "zod";
import { Address } from "./address.js";
/**
 * User account in an organization
 */
export type User = {
    _id?: string | undefined;
    slug?: string | undefined;
    orgId: string;
    fullName?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    middleName?: string | undefined;
    email: string;
    mobile?: string | undefined;
    hasLoggedIn?: boolean | undefined;
    designation?: string | undefined;
    address?: Address | undefined;
    dataCollectionConsent?: boolean | undefined;
    isDeleted?: boolean | undefined;
    deletedBy?: string | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
};
export declare const User$zodSchema: z.ZodType<User>;
//# sourceMappingURL=user.d.ts.map