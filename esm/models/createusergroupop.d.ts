import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Group type determining behavior and privileges
 */
export declare const CreateUserGroupType: {
    readonly Admin: "admin";
    readonly Standard: "standard";
    readonly Everyone: "everyone";
    readonly Custom: "custom";
};
/**
 * Group type determining behavior and privileges
 */
export type CreateUserGroupType = ClosedEnum<typeof CreateUserGroupType>;
export declare const CreateUserGroupType$zodSchema: z.ZodEnum<{
    custom: "custom";
    standard: "standard";
    admin: "admin";
    everyone: "everyone";
}>;
/**
 * Request payload
 */
export type CreateUserGroupRequest = {
    name: string;
    type: CreateUserGroupType;
    description?: string | undefined;
};
export declare const CreateUserGroupRequest$zodSchema: z.ZodType<CreateUserGroupRequest>;
//# sourceMappingURL=createusergroupop.d.ts.map