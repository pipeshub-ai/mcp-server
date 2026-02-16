import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const UpdateAgentPermissionsAccessLevel: {
    readonly Read: "read";
    readonly Use: "use";
    readonly Edit: "edit";
};
export type UpdateAgentPermissionsAccessLevel = ClosedEnum<typeof UpdateAgentPermissionsAccessLevel>;
export declare const UpdateAgentPermissionsAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    use: "use";
    edit: "edit";
}>;
export type UpdateAgentPermissionsSharedWith = {
    userId?: string | undefined;
    accessLevel?: UpdateAgentPermissionsAccessLevel | undefined;
};
export declare const UpdateAgentPermissionsSharedWith$zodSchema: z.ZodType<UpdateAgentPermissionsSharedWith>;
/**
 * Request body for Update agent permissions
 */
export type UpdateAgentPermissionsRequestBody = {
    isPublic?: boolean | undefined;
    sharedWith?: Array<UpdateAgentPermissionsSharedWith> | undefined;
};
export declare const UpdateAgentPermissionsRequestBody$zodSchema: z.ZodType<UpdateAgentPermissionsRequestBody>;
export type UpdateAgentPermissionsRequest = {
    agentKey: string;
    body: UpdateAgentPermissionsRequestBody;
};
export declare const UpdateAgentPermissionsRequest$zodSchema: z.ZodType<UpdateAgentPermissionsRequest>;
//# sourceMappingURL=updateagentpermissionsop.d.ts.map