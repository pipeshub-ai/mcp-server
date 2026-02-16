import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * New role to assign to the user
 */
export declare const UpdateTeamUserPermissionsRole: {
    readonly Owner: "owner";
    readonly Admin: "admin";
    readonly Member: "member";
    readonly Viewer: "viewer";
};
/**
 * New role to assign to the user
 */
export type UpdateTeamUserPermissionsRole = ClosedEnum<typeof UpdateTeamUserPermissionsRole>;
export declare const UpdateTeamUserPermissionsRole$zodSchema: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    member: "member";
    viewer: "viewer";
}>;
/**
 * Request payload
 */
export type UpdateTeamUserPermissionsRequestBody = {
    userId: string;
    role: UpdateTeamUserPermissionsRole;
};
export declare const UpdateTeamUserPermissionsRequestBody$zodSchema: z.ZodType<UpdateTeamUserPermissionsRequestBody>;
export type UpdateTeamUserPermissionsRequest = {
    teamId: string;
    body: UpdateTeamUserPermissionsRequestBody;
};
export declare const UpdateTeamUserPermissionsRequest$zodSchema: z.ZodType<UpdateTeamUserPermissionsRequest>;
/**
 * User role updated successfully
 */
export type UpdateTeamUserPermissionsResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    previousRole?: string | undefined;
    newRole?: string | undefined;
};
export declare const UpdateTeamUserPermissionsResponse$zodSchema: z.ZodType<UpdateTeamUserPermissionsResponse>;
//# sourceMappingURL=updateteamuserpermissionsop.d.ts.map