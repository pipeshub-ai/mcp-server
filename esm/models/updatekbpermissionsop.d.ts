import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const UpdateKBPermissionsRole: {
    readonly Owner: "OWNER";
    readonly Organizer: "ORGANIZER";
    readonly Fileorganizer: "FILEORGANIZER";
    readonly Writer: "WRITER";
    readonly Commenter: "COMMENTER";
    readonly Reader: "READER";
};
export type UpdateKBPermissionsRole = ClosedEnum<typeof UpdateKBPermissionsRole>;
export declare const UpdateKBPermissionsRole$zodSchema: z.ZodEnum<{
    OWNER: "OWNER";
    ORGANIZER: "ORGANIZER";
    FILEORGANIZER: "FILEORGANIZER";
    WRITER: "WRITER";
    COMMENTER: "COMMENTER";
    READER: "READER";
}>;
/**
 * Request body for Update permissions
 */
export type UpdateKBPermissionsRequestBody = {
    userIds?: Array<string> | undefined;
    teamIds?: Array<string> | undefined;
    role: UpdateKBPermissionsRole;
};
export declare const UpdateKBPermissionsRequestBody$zodSchema: z.ZodType<UpdateKBPermissionsRequestBody>;
export type UpdateKBPermissionsRequest = {
    kbId: string;
    body: UpdateKBPermissionsRequestBody;
};
export declare const UpdateKBPermissionsRequest$zodSchema: z.ZodType<UpdateKBPermissionsRequest>;
//# sourceMappingURL=updatekbpermissionsop.d.ts.map