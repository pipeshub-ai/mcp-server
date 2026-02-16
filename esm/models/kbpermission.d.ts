import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Permission role
 */
export declare const KBPermissionRole: {
    readonly Owner: "OWNER";
    readonly Organizer: "ORGANIZER";
    readonly Fileorganizer: "FILEORGANIZER";
    readonly Writer: "WRITER";
    readonly Commenter: "COMMENTER";
    readonly Reader: "READER";
};
/**
 * Permission role
 */
export type KBPermissionRole = ClosedEnum<typeof KBPermissionRole>;
export declare const KBPermissionRole$zodSchema: z.ZodEnum<{
    OWNER: "OWNER";
    ORGANIZER: "ORGANIZER";
    FILEORGANIZER: "FILEORGANIZER";
    WRITER: "WRITER";
    COMMENTER: "COMMENTER";
    READER: "READER";
}>;
export type KBPermission = {
    userId?: string | undefined;
    teamId?: string | undefined;
    role?: KBPermissionRole | undefined;
    kbId?: string | undefined;
    grantedBy?: string | undefined;
    grantedAt?: number | undefined;
};
export declare const KBPermission$zodSchema: z.ZodType<KBPermission>;
//# sourceMappingURL=kbpermission.d.ts.map