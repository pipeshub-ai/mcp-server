import * as z from "zod";
import { UserGroup } from "./usergroup.js";
export type GetGroupsForUserRequest = {
    userId: string;
};
export declare const GetGroupsForUserRequest$zodSchema: z.ZodType<GetGroupsForUserRequest>;
/**
 * User's groups retrieved successfully
 */
export type GetGroupsForUserResponse = {
    success?: boolean | undefined;
    data?: Array<UserGroup> | undefined;
};
export declare const GetGroupsForUserResponse$zodSchema: z.ZodType<GetGroupsForUserResponse>;
//# sourceMappingURL=getgroupsforuserop.d.ts.map