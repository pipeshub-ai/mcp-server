import * as z from "zod";
/**
 * Request payload
 */
export type BulkInviteUsersRequest = {
    emails: Array<string>;
    groupIds?: Array<string> | undefined;
    sendEmail?: boolean | undefined;
};
export declare const BulkInviteUsersRequest$zodSchema: z.ZodType<BulkInviteUsersRequest>;
export type Failure = {
    email?: string | undefined;
    reason?: string | undefined;
};
export declare const Failure$zodSchema: z.ZodType<Failure>;
/**
 * Bulk invitation processed
 */
export type BulkInviteUsersResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    invited?: number | undefined;
    skipped?: number | undefined;
    failed?: number | undefined;
    failures?: Array<Failure> | undefined;
};
export declare const BulkInviteUsersResponse$zodSchema: z.ZodType<BulkInviteUsersResponse>;
//# sourceMappingURL=bulkinviteusersop.d.ts.map