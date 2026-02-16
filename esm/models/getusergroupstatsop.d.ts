import * as z from "zod";
export type GroupsByType = {
    admin?: number | undefined;
    standard?: number | undefined;
    everyone?: number | undefined;
    custom?: number | undefined;
};
export declare const GroupsByType$zodSchema: z.ZodType<GroupsByType>;
export type GetUserGroupStatsGroup = {
    _id?: string | undefined;
    name?: string | undefined;
    type?: string | undefined;
    memberCount?: number | undefined;
};
export declare const GetUserGroupStatsGroup$zodSchema: z.ZodType<GetUserGroupStatsGroup>;
export type GetUserGroupStatsData = {
    totalGroups?: number | undefined;
    groupsByType?: GroupsByType | undefined;
    totalMembers?: number | undefined;
    groups?: Array<GetUserGroupStatsGroup> | undefined;
};
export declare const GetUserGroupStatsData$zodSchema: z.ZodType<GetUserGroupStatsData>;
/**
 * User group statistics retrieved successfully
 */
export type GetUserGroupStatsResponse = {
    success?: boolean | undefined;
    data?: GetUserGroupStatsData | undefined;
};
export declare const GetUserGroupStatsResponse$zodSchema: z.ZodType<GetUserGroupStatsResponse>;
//# sourceMappingURL=getusergroupstatsop.d.ts.map