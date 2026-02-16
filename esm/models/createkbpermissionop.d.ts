import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Permission role to grant
 */
export declare const CreateKBPermissionRole: {
    readonly Owner: "OWNER";
    readonly Organizer: "ORGANIZER";
    readonly Fileorganizer: "FILEORGANIZER";
    readonly Writer: "WRITER";
    readonly Commenter: "COMMENTER";
    readonly Reader: "READER";
};
/**
 * Permission role to grant
 */
export type CreateKBPermissionRole = ClosedEnum<typeof CreateKBPermissionRole>;
export declare const CreateKBPermissionRole$zodSchema: z.ZodEnum<{
    OWNER: "OWNER";
    ORGANIZER: "ORGANIZER";
    FILEORGANIZER: "FILEORGANIZER";
    WRITER: "WRITER";
    COMMENTER: "COMMENTER";
    READER: "READER";
}>;
/**
 * Request payload
 */
export type CreateKBPermissionRequestBody = {
    userIds?: Array<string> | undefined;
    teamIds?: Array<string> | undefined;
    role: CreateKBPermissionRole;
};
export declare const CreateKBPermissionRequestBody$zodSchema: z.ZodType<CreateKBPermissionRequestBody>;
export type CreateKBPermissionRequest = {
    kbId: string;
    body: CreateKBPermissionRequestBody;
};
export declare const CreateKBPermissionRequest$zodSchema: z.ZodType<CreateKBPermissionRequest>;
export type PermissionResult = {
    grantedCount?: number | undefined;
    updatedCount?: number | undefined;
};
export declare const PermissionResult$zodSchema: z.ZodType<PermissionResult>;
/**
 * Permissions granted successfully
 */
export type CreateKBPermissionResponse = {
    kbId?: string | undefined;
    permissionResult?: PermissionResult | undefined;
};
export declare const CreateKBPermissionResponse$zodSchema: z.ZodType<CreateKBPermissionResponse>;
//# sourceMappingURL=createkbpermissionop.d.ts.map