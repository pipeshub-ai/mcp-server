import * as z from "zod";
/**
 * Request payload
 */
export type UpdateUserGroupRequestBody = {
    name?: string | undefined;
    description?: string | undefined;
};
export declare const UpdateUserGroupRequestBody$zodSchema: z.ZodType<UpdateUserGroupRequestBody>;
export type UpdateUserGroupRequest = {
    groupId: string;
    body: UpdateUserGroupRequestBody;
};
export declare const UpdateUserGroupRequest$zodSchema: z.ZodType<UpdateUserGroupRequest>;
//# sourceMappingURL=updateusergroupop.d.ts.map