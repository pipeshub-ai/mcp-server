import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export type GetAgentPermissionsRequest = {
    agentKey: string;
};
export declare const GetAgentPermissionsRequest$zodSchema: z.ZodType<GetAgentPermissionsRequest>;
export declare const GetAgentPermissionsAccessLevel: {
    readonly Read: "read";
    readonly Use: "use";
    readonly Edit: "edit";
};
export type GetAgentPermissionsAccessLevel = ClosedEnum<typeof GetAgentPermissionsAccessLevel>;
export declare const GetAgentPermissionsAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    use: "use";
    edit: "edit";
}>;
export type GetAgentPermissionsSharedWith = {
    userId?: string | undefined;
    accessLevel?: GetAgentPermissionsAccessLevel | undefined;
};
export declare const GetAgentPermissionsSharedWith$zodSchema: z.ZodType<GetAgentPermissionsSharedWith>;
/**
 * Permission configuration
 */
export type GetAgentPermissionsResponse = {
    isPublic?: boolean | undefined;
    sharedWith?: Array<GetAgentPermissionsSharedWith> | undefined;
};
export declare const GetAgentPermissionsResponse$zodSchema: z.ZodType<GetAgentPermissionsResponse>;
//# sourceMappingURL=getagentpermissionsop.d.ts.map