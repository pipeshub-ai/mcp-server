import * as z from "zod";
import { SchemeOauth2 } from "./schemeoauth2.js";
export type Security = {
    bearerAuth?: string | undefined;
    oauth2?: SchemeOauth2 | undefined;
};
export declare const Security$zodSchema: z.ZodType<Security>;
//# sourceMappingURL=security.d.ts.map