import * as z from "zod";
export type DeleteTeamRequest = {
    teamId: string;
};
export declare const DeleteTeamRequest$zodSchema: z.ZodType<DeleteTeamRequest>;
/**
 * Team deleted successfully
 */
export type DeleteTeamResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const DeleteTeamResponse$zodSchema: z.ZodType<DeleteTeamResponse>;
//# sourceMappingURL=deleteteamop.d.ts.map