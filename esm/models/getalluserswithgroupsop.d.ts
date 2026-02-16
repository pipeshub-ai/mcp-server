import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export type GetAllUsersWithGroupsRequest = {
    includeDeleted?: boolean | undefined;
};
export declare const GetAllUsersWithGroupsRequest$zodSchema: z.ZodType<GetAllUsersWithGroupsRequest>;
export declare const GetAllUsersWithGroupsType: {
    readonly Admin: "admin";
    readonly Standard: "standard";
    readonly Everyone: "everyone";
    readonly Custom: "custom";
};
export type GetAllUsersWithGroupsType = ClosedEnum<typeof GetAllUsersWithGroupsType>;
export declare const GetAllUsersWithGroupsType$zodSchema: z.ZodEnum<{
    custom: "custom";
    standard: "standard";
    admin: "admin";
    everyone: "everyone";
}>;
export type GetAllUsersWithGroupsGroup = {
    _id?: string | undefined;
    name?: string | undefined;
    type?: GetAllUsersWithGroupsType | undefined;
};
export declare const GetAllUsersWithGroupsGroup$zodSchema: z.ZodType<GetAllUsersWithGroupsGroup>;
export type GetAllUsersWithGroupsData = {
    _id?: string | undefined;
    userId?: string | undefined;
    orgId?: string | undefined;
    fullName?: string | undefined;
    hasLoggedIn?: boolean | undefined;
    groups?: Array<GetAllUsersWithGroupsGroup> | undefined;
};
export declare const GetAllUsersWithGroupsData$zodSchema: z.ZodType<GetAllUsersWithGroupsData>;
/**
 * Users with groups retrieved successfully
 */
export type GetAllUsersWithGroupsResponse = {
    success?: boolean | undefined;
    data?: Array<GetAllUsersWithGroupsData> | undefined;
};
export declare const GetAllUsersWithGroupsResponse$zodSchema: z.ZodType<GetAllUsersWithGroupsResponse>;
//# sourceMappingURL=getalluserswithgroupsop.d.ts.map