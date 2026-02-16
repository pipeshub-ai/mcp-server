import * as z from "zod";
export type ResendUserInviteRequest = {
    id: string;
};
export declare const ResendUserInviteRequest$zodSchema: z.ZodType<ResendUserInviteRequest>;
/**
 * Invitation resent successfully
 */
export type ResendUserInviteResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    sentTo?: string | undefined;
};
export declare const ResendUserInviteResponse$zodSchema: z.ZodType<ResendUserInviteResponse>;
//# sourceMappingURL=resenduserinviteop.d.ts.map