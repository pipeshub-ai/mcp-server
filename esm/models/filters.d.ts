import * as z from "zod";
import { AppType } from "./apptype.js";
export type Filters = {
    apps?: Array<AppType> | undefined;
    kb?: Array<string> | undefined;
};
export declare const Filters$zodSchema: z.ZodType<Filters>;
//# sourceMappingURL=filters.d.ts.map