import * as z from "zod";
import { Team } from "./team.js";
/**
 * Request payload
 */
export type UpdateTeamRequestBody = {
    name?: string | undefined;
    description?: string | undefined;
};
export declare const UpdateTeamRequestBody$zodSchema: z.ZodType<UpdateTeamRequestBody>;
export type UpdateTeamRequest = {
    teamId: string;
    body: UpdateTeamRequestBody;
};
export declare const UpdateTeamRequest$zodSchema: z.ZodType<UpdateTeamRequest>;
/**
 * Team updated successfully
 */
export type UpdateTeamResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: Team | undefined;
};
export declare const UpdateTeamResponse$zodSchema: z.ZodType<UpdateTeamResponse>;
//# sourceMappingURL=updateteamop.d.ts.map