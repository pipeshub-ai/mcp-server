import * as z from "zod";
/**
 * Request to create initial organization auth configuration
 */
export type OrgAuthConfigCreateRequest = {
    contactEmail: string;
    registeredName: string;
    adminFullName: string;
    sendEmail?: boolean | undefined;
};
export declare const OrgAuthConfigCreateRequest$zodSchema: z.ZodType<OrgAuthConfigCreateRequest>;
//# sourceMappingURL=orgauthconfigcreaterequest.d.ts.map