import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Scope determines visibility and access control for connectors:<br>
 *
 * @remarks
 * <ul>
 * <li><code>team</code> - Available to all users in the organization (admin-only creation)</li>
 * <li><code>personal</code> - Private to the creating user only</li>
 * </ul>
 */
export declare const ConnectorScope: {
    readonly Team: "team";
    readonly Personal: "personal";
};
/**
 * Scope determines visibility and access control for connectors:<br>
 *
 * @remarks
 * <ul>
 * <li><code>team</code> - Available to all users in the organization (admin-only creation)</li>
 * <li><code>personal</code> - Private to the creating user only</li>
 * </ul>
 */
export type ConnectorScope = ClosedEnum<typeof ConnectorScope>;
export declare const ConnectorScope$zodSchema: z.ZodEnum<{
    team: "team";
    personal: "personal";
}>;
//# sourceMappingURL=connectorscope.d.ts.map