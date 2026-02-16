import * as z from "zod";
import { KBPermission } from "./kbpermission.js";
export type ListKBPermissionsRequest = {
    kbId: string;
};
export declare const ListKBPermissionsRequest$zodSchema: z.ZodType<ListKBPermissionsRequest>;
/**
 * Permissions list retrieved
 */
export type ListKBPermissionsResponse = {
    kbId?: string | undefined;
    permissions?: Array<KBPermission> | undefined;
    totalCount?: number | undefined;
};
export declare const ListKBPermissionsResponse$zodSchema: z.ZodType<ListKBPermissionsResponse>;
//# sourceMappingURL=listkbpermissionsop.d.ts.map