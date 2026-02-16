import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Group type:
 *
 * @remarks
 * - admin: System admin group (cannot be modified)
 * - standard: Default user group
 * - everyone: All users group (cannot be modified)
 * - custom: User-created custom group
 */
export declare const UserGroupType: {
    readonly Admin: "admin";
    readonly Standard: "standard";
    readonly Everyone: "everyone";
    readonly Custom: "custom";
};
/**
 * Group type:
 *
 * @remarks
 * - admin: System admin group (cannot be modified)
 * - standard: Default user group
 * - everyone: All users group (cannot be modified)
 * - custom: User-created custom group
 */
export type UserGroupType = ClosedEnum<typeof UserGroupType>;
export declare const UserGroupType$zodSchema: z.ZodEnum<{
    custom: "custom";
    standard: "standard";
    admin: "admin";
    everyone: "everyone";
}>;
/**
 * User group for organizing users within an organization
 */
export type UserGroup = {
    _id?: string | undefined;
    slug?: string | undefined;
    type: UserGroupType;
    name: string;
    orgId: string;
    users?: Array<string> | undefined;
    isDeleted?: boolean | undefined;
    deletedBy?: string | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
};
export declare const UserGroup$zodSchema: z.ZodType<UserGroup>;
//# sourceMappingURL=usergroup.d.ts.map