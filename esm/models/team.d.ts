import * as z from "zod";
import { UserRole } from "./userrole.js";
export type Team = {
    _id?: string | undefined;
    name: string;
    description?: string | undefined;
    orgId?: string | undefined;
    userRoles?: Array<UserRole> | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
};
export declare const Team$zodSchema: z.ZodType<Team>;
//# sourceMappingURL=team.d.ts.map