import * as z from "zod";
/**
 * Request payload
 */
export type RemoveUsersFromTeamRequestBody = {
    userIds: Array<string>;
};
export declare const RemoveUsersFromTeamRequestBody$zodSchema: z.ZodType<RemoveUsersFromTeamRequestBody>;
export type RemoveUsersFromTeamRequest = {
    teamId: string;
    body: RemoveUsersFromTeamRequestBody;
};
export declare const RemoveUsersFromTeamRequest$zodSchema: z.ZodType<RemoveUsersFromTeamRequest>;
/**
 * Users removed from team successfully
 */
export type RemoveUsersFromTeamResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    removedCount?: number | undefined;
};
export declare const RemoveUsersFromTeamResponse$zodSchema: z.ZodType<RemoveUsersFromTeamResponse>;
//# sourceMappingURL=removeusersfromteamop.d.ts.map