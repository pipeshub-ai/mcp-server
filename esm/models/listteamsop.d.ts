import * as z from "zod";
import { Team } from "./team.js";
export type ListTeamsRequest = {
    search?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
};
export declare const ListTeamsRequest$zodSchema: z.ZodType<ListTeamsRequest>;
export type ListTeamsPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
    totalPages?: number | undefined;
};
export declare const ListTeamsPagination$zodSchema: z.ZodType<ListTeamsPagination>;
/**
 * Teams retrieved successfully
 */
export type ListTeamsResponse = {
    success?: boolean | undefined;
    data?: Array<Team> | undefined;
    pagination?: ListTeamsPagination | undefined;
};
export declare const ListTeamsResponse$zodSchema: z.ZodType<ListTeamsResponse>;
//# sourceMappingURL=listteamsop.d.ts.map