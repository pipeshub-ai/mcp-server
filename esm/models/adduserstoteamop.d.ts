import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Role to assign to the user
 */
export declare const AddUsersToTeamRole: {
    readonly Admin: "admin";
    readonly Member: "member";
    readonly Viewer: "viewer";
};
/**
 * Role to assign to the user
 */
export type AddUsersToTeamRole = ClosedEnum<typeof AddUsersToTeamRole>;
export declare const AddUsersToTeamRole$zodSchema: z.ZodEnum<{
    admin: "admin";
    member: "member";
    viewer: "viewer";
}>;
export type AddUsersToTeamUser = {
    userId: string;
    role?: AddUsersToTeamRole | undefined;
};
export declare const AddUsersToTeamUser$zodSchema: z.ZodType<AddUsersToTeamUser>;
/**
 * Request payload
 */
export type AddUsersToTeamRequestBody = {
    users: Array<AddUsersToTeamUser>;
};
export declare const AddUsersToTeamRequestBody$zodSchema: z.ZodType<AddUsersToTeamRequestBody>;
export type AddUsersToTeamRequest = {
    teamId: string;
    body: AddUsersToTeamRequestBody;
};
export declare const AddUsersToTeamRequest$zodSchema: z.ZodType<AddUsersToTeamRequest>;
/**
 * Users added to team successfully
 */
export type AddUsersToTeamResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    addedCount?: number | undefined;
    skippedCount?: number | undefined;
};
export declare const AddUsersToTeamResponse$zodSchema: z.ZodType<AddUsersToTeamResponse>;
//# sourceMappingURL=adduserstoteamop.d.ts.map