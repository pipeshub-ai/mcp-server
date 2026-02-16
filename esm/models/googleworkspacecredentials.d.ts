import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of credentials: 'individual' for OAuth, 'business' for service account
 */
export declare const UserType: {
    readonly Individual: "individual";
    readonly Business: "business";
};
/**
 * Type of credentials: 'individual' for OAuth, 'business' for service account
 */
export type UserType = ClosedEnum<typeof UserType>;
export declare const UserType$zodSchema: z.ZodEnum<{
    individual: "individual";
    business: "business";
}>;
/**
 * Credential data (structure depends on userType)
 */
export type GoogleWorkspaceCredentialsCredentials = {};
export declare const GoogleWorkspaceCredentialsCredentials$zodSchema: z.ZodType<GoogleWorkspaceCredentialsCredentials>;
/**
 * Google Workspace service account or OAuth credentials
 */
export type GoogleWorkspaceCredentials = {
    userType?: UserType | undefined;
    credentials?: GoogleWorkspaceCredentialsCredentials | undefined;
};
export declare const GoogleWorkspaceCredentials$zodSchema: z.ZodType<GoogleWorkspaceCredentials>;
//# sourceMappingURL=googleworkspacecredentials.d.ts.map