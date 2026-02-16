import * as z from "zod";
import { Team } from "./team.js";
export type GetTeamByIdRequest = {
    teamId: string;
};
export declare const GetTeamByIdRequest$zodSchema: z.ZodType<GetTeamByIdRequest>;
/**
 * Team details retrieved successfully
 */
export type GetTeamByIdResponse = {
    success?: boolean | undefined;
    data?: Team | undefined;
};
export declare const GetTeamByIdResponse$zodSchema: z.ZodType<GetTeamByIdResponse>;
//# sourceMappingURL=getteambyidop.d.ts.map