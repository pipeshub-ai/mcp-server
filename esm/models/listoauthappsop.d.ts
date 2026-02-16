import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Filter by status
 */
export declare const ListOAuthAppsStatus: {
    readonly Active: "active";
    readonly Suspended: "suspended";
    readonly Revoked: "revoked";
};
/**
 * Filter by status
 */
export type ListOAuthAppsStatus = ClosedEnum<typeof ListOAuthAppsStatus>;
export declare const ListOAuthAppsStatus$zodSchema: z.ZodEnum<{
    active: "active";
    suspended: "suspended";
    revoked: "revoked";
}>;
export type ListOAuthAppsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    status?: ListOAuthAppsStatus | undefined;
    search?: string | undefined;
};
export declare const ListOAuthAppsRequest$zodSchema: z.ZodType<ListOAuthAppsRequest>;
//# sourceMappingURL=listoauthappsop.d.ts.map