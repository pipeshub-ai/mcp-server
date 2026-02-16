import * as z from "zod";
/**
 * Request payload
 */
export type AddUsersToGroupRequest = {
    groupId: string;
    userIds: Array<string>;
};
export declare const AddUsersToGroupRequest$zodSchema: z.ZodType<AddUsersToGroupRequest>;
/**
 * Users added to group successfully
 */
export type AddUsersToGroupResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    addedCount?: number | undefined;
    skippedCount?: number | undefined;
};
export declare const AddUsersToGroupResponse$zodSchema: z.ZodType<AddUsersToGroupResponse>;
//# sourceMappingURL=adduserstogroupop.d.ts.map