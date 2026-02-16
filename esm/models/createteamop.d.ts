import * as z from "zod";
import { Team } from "./team.js";
import { UserRole } from "./userrole.js";
/**
 * Request payload
 */
export type CreateTeamRequest = {
    name: string;
    description?: string | undefined;
    userRoles?: Array<UserRole> | undefined;
};
export declare const CreateTeamRequest$zodSchema: z.ZodType<CreateTeamRequest>;
/**
 * Team created successfully
 */
export type CreateTeamResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: Team | undefined;
};
export declare const CreateTeamResponse$zodSchema: z.ZodType<CreateTeamResponse>;
//# sourceMappingURL=createteamop.d.ts.map