import * as z from "zod";
/**
 * Request payload
 */
export type RemoveUsersFromGroupRequest = {
    groupId: string;
    userIds: Array<string>;
};
export declare const RemoveUsersFromGroupRequest$zodSchema: z.ZodType<RemoveUsersFromGroupRequest>;
/**
 * Users removed from group successfully
 */
export type RemoveUsersFromGroupResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    removedCount?: number | undefined;
};
export declare const RemoveUsersFromGroupResponse$zodSchema: z.ZodType<RemoveUsersFromGroupResponse>;
//# sourceMappingURL=removeusersfromgroupop.d.ts.map