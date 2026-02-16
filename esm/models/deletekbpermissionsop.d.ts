import * as z from "zod";
/**
 * Request body for Remove permissions
 */
export type DeleteKBPermissionsRequestBody = {
    userIds?: Array<string> | undefined;
    teamIds?: Array<string> | undefined;
};
export declare const DeleteKBPermissionsRequestBody$zodSchema: z.ZodType<DeleteKBPermissionsRequestBody>;
export type DeleteKBPermissionsRequest = {
    kbId: string;
    body: DeleteKBPermissionsRequestBody;
};
export declare const DeleteKBPermissionsRequest$zodSchema: z.ZodType<DeleteKBPermissionsRequest>;
//# sourceMappingURL=deletekbpermissionsop.d.ts.map