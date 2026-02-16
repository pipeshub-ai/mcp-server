import * as z from "zod";
import { AuthStep } from "./authstep.js";
/**
 * Organization authentication configuration. Supports 1-3 authentication steps for multi-factor authentication.
 *
 * @remarks
 * **Validation Rules:**
 * - Minimum 1 step, maximum 3 steps
 * - Each step must have unique order
 * - No duplicate methods within the same step
 * - No method can appear in multiple steps
 */
export type AuthConfig = {
    authMethods: Array<AuthStep>;
};
export declare const AuthConfig$zodSchema: z.ZodType<AuthConfig>;
//# sourceMappingURL=authconfig.d.ts.map