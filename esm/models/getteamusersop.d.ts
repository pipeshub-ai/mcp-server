import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
import { User } from "./user.js";
export type GetTeamUsersRequest = {
    teamId: string;
    page?: number | undefined;
    limit?: number | undefined;
};
export declare const GetTeamUsersRequest$zodSchema: z.ZodType<GetTeamUsersRequest>;
export declare const GetTeamUsersRole: {
    readonly Owner: "owner";
    readonly Admin: "admin";
    readonly Member: "member";
    readonly Viewer: "viewer";
};
export type GetTeamUsersRole = ClosedEnum<typeof GetTeamUsersRole>;
export declare const GetTeamUsersRole$zodSchema: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    member: "member";
    viewer: "viewer";
}>;
export type GetTeamUsersData = {
    user?: User | undefined;
    role?: GetTeamUsersRole | undefined;
    joinedAt?: string | undefined;
};
export declare const GetTeamUsersData$zodSchema: z.ZodType<GetTeamUsersData>;
export type GetTeamUsersPagination = {
    page?: number | undefined;
    limit?: number | undefined;
    total?: number | undefined;
};
export declare const GetTeamUsersPagination$zodSchema: z.ZodType<GetTeamUsersPagination>;
/**
 * Team members retrieved successfully
 */
export type GetTeamUsersResponse = {
    success?: boolean | undefined;
    data?: Array<GetTeamUsersData> | undefined;
    pagination?: GetTeamUsersPagination | undefined;
};
export declare const GetTeamUsersResponse$zodSchema: z.ZodType<GetTeamUsersResponse>;
//# sourceMappingURL=getteamusersop.d.ts.map