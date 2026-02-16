import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Team } from "./team.js";
export type GetUserTeamsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
};
export declare const GetUserTeamsRequest$zodSchema: z.ZodType<GetUserTeamsRequest>;
export declare const GetUserTeamsRole: {
    readonly Owner: "owner";
    readonly Admin: "admin";
    readonly Member: "member";
    readonly Viewer: "viewer";
};
export type GetUserTeamsRole = ClosedEnum<typeof GetUserTeamsRole>;
export declare const GetUserTeamsRole$zodSchema: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    member: "member";
    viewer: "viewer";
}>;
export type GetUserTeamsData = {
    team?: Team | undefined;
    role?: GetUserTeamsRole | undefined;
    joinedAt?: string | undefined;
};
export declare const GetUserTeamsData$zodSchema: z.ZodType<GetUserTeamsData>;
export type GetUserTeamsPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
};
export declare const GetUserTeamsPagination$zodSchema: z.ZodType<GetUserTeamsPagination>;
/**
 * User's teams retrieved successfully
 */
export type GetUserTeamsResponse = {
    success?: boolean | undefined;
    data?: Array<GetUserTeamsData> | undefined;
    pagination?: GetUserTeamsPagination | undefined;
};
export declare const GetUserTeamsResponse$zodSchema: z.ZodType<GetUserTeamsResponse>;
//# sourceMappingURL=getuserteamsop.d.ts.map