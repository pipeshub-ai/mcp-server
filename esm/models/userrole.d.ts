import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * User's role in the team
 */
export declare const UserRoleRole: {
    readonly Owner: "OWNER";
    readonly Reader: "READER";
};
/**
 * User's role in the team
 */
export type UserRoleRole = ClosedEnum<typeof UserRoleRole>;
export declare const UserRoleRole$zodSchema: z.ZodEnum<{
    OWNER: "OWNER";
    READER: "READER";
}>;
export type UserRole = {
    userId: string;
    role: UserRoleRole;
};
export declare const UserRole$zodSchema: z.ZodType<UserRole>;
//# sourceMappingURL=userrole.d.ts.map