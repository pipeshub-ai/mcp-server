import * as z from "zod";
export type DeleteUserGroupRequest = {
    groupId: string;
};
export declare const DeleteUserGroupRequest$zodSchema: z.ZodType<DeleteUserGroupRequest>;
/**
 * User group deleted successfully
 */
export type DeleteUserGroupResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const DeleteUserGroupResponse$zodSchema: z.ZodType<DeleteUserGroupResponse>;
//# sourceMappingURL=deleteusergroupop.d.ts.map