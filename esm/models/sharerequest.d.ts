import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Permission level for shared users:
 *
 * @remarks
 * <ul>
 * <li><code>read</code> - Can view only</li>
 * <li><code>write</code> - Can add messages</li>
 * </ul>
 */
export declare const ShareRequestAccessLevel: {
    readonly Read: "read";
    readonly Write: "write";
};
/**
 * Permission level for shared users:
 *
 * @remarks
 * <ul>
 * <li><code>read</code> - Can view only</li>
 * <li><code>write</code> - Can add messages</li>
 * </ul>
 */
export type ShareRequestAccessLevel = ClosedEnum<typeof ShareRequestAccessLevel>;
export declare const ShareRequestAccessLevel$zodSchema: z.ZodEnum<{
    read: "read";
    write: "write";
}>;
/**
 * Request to share a conversation or search with other users
 */
export type ShareRequest = {
    userIds: Array<string>;
    accessLevel?: ShareRequestAccessLevel | undefined;
};
export declare const ShareRequest$zodSchema: z.ZodType<ShareRequest>;
//# sourceMappingURL=sharerequest.d.ts.map