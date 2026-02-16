import * as z from "zod";
import { UserGroup } from "./usergroup.js";
/**
 * List of user groups retrieved successfully
 */
export type GetAllUserGroupsResponse = {
    success?: boolean | undefined;
    data?: Array<UserGroup> | undefined;
};
export declare const GetAllUserGroupsResponse$zodSchema: z.ZodType<GetAllUserGroupsResponse>;
//# sourceMappingURL=getallusergroupsop.d.ts.map