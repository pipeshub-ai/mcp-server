import * as z from "zod";
import { AuthMethod } from "./authmethod.js";
/**
 * A single step in multi-factor authentication flow
 */
export type AuthStep = {
    order: number;
    allowedMethods: Array<AuthMethod>;
};
export declare const AuthStep$zodSchema: z.ZodType<AuthStep>;
//# sourceMappingURL=authstep.d.ts.map