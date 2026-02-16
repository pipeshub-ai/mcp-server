import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { Team } from "./team.js";
export type GetUserCreatedTeamsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
};
export declare const GetUserCreatedTeamsRequest$zodSchema: z.ZodType<GetUserCreatedTeamsRequest>;
/**
 * User's current role (none if no longer a member)
 */
export declare const CurrentRole: {
    readonly Owner: "owner";
    readonly Admin: "admin";
    readonly Member: "member";
    readonly Viewer: "viewer";
    readonly None: "none";
};
/**
 * User's current role (none if no longer a member)
 */
export type CurrentRole = ClosedEnum<typeof CurrentRole>;
export declare const CurrentRole$zodSchema: z.ZodEnum<{
    none: "none";
    owner: "owner";
    admin: "admin";
    member: "member";
    viewer: "viewer";
}>;
export type GetUserCreatedTeamsData = {
    team?: Team | undefined;
    currentRole?: CurrentRole | undefined;
    createdAt?: string | undefined;
};
export declare const GetUserCreatedTeamsData$zodSchema: z.ZodType<GetUserCreatedTeamsData>;
export type GetUserCreatedTeamsPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
};
export declare const GetUserCreatedTeamsPagination$zodSchema: z.ZodType<GetUserCreatedTeamsPagination>;
/**
 * User's created teams retrieved successfully
 */
export type GetUserCreatedTeamsResponse = {
    success?: boolean | undefined;
    data?: Array<GetUserCreatedTeamsData> | undefined;
    pagination?: GetUserCreatedTeamsPagination | undefined;
};
export declare const GetUserCreatedTeamsResponse$zodSchema: z.ZodType<GetUserCreatedTeamsResponse>;
//# sourceMappingURL=getusercreatedteamsop.d.ts.map