import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type: 'business' for service account, 'individual' for user OAuth
 */
export declare const CreateGoogleWorkspaceCredentialsUserType: {
    readonly Individual: "individual";
    readonly Business: "business";
};
/**
 * Type: 'business' for service account, 'individual' for user OAuth
 */
export type CreateGoogleWorkspaceCredentialsUserType = ClosedEnum<typeof CreateGoogleWorkspaceCredentialsUserType>;
export declare const CreateGoogleWorkspaceCredentialsUserType$zodSchema: z.ZodEnum<{
    individual: "individual";
    business: "business";
}>;
export type CreateGoogleWorkspaceCredentialsGoogleWorkspaceCredentials = {
    fileName: string;
    content: Uint8Array | string;
};
export declare const CreateGoogleWorkspaceCredentialsGoogleWorkspaceCredentials$zodSchema: z.ZodType<CreateGoogleWorkspaceCredentialsGoogleWorkspaceCredentials>;
/**
 * Request body for Upload Google Workspace credentials
 */
export type CreateGoogleWorkspaceCredentialsRequest = {
    userType: CreateGoogleWorkspaceCredentialsUserType;
    googleWorkspaceCredentials: CreateGoogleWorkspaceCredentialsGoogleWorkspaceCredentials | Blob;
};
export declare const CreateGoogleWorkspaceCredentialsRequest$zodSchema: z.ZodType<CreateGoogleWorkspaceCredentialsRequest>;
//# sourceMappingURL=creategoogleworkspacecredentialsop.d.ts.map