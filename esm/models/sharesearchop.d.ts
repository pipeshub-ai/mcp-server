import * as z from "zod";
import { ShareRequest } from "./sharerequest.js";
export type ShareSearchRequest = {
    searchId: string;
    body: ShareRequest;
};
export declare const ShareSearchRequest$zodSchema: z.ZodType<ShareSearchRequest>;
//# sourceMappingURL=sharesearchop.d.ts.map