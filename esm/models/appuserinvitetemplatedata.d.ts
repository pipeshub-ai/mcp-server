import * as z from "zod";
/**
 * Template data for user invitation email
 */
export type AppUserInviteTemplateData = {
    invitee: string;
    orgName: string;
    link: string;
};
export declare const AppUserInviteTemplateData$zodSchema: z.ZodType<AppUserInviteTemplateData>;
//# sourceMappingURL=appuserinvitetemplatedata.d.ts.map