import * as z from "zod";
import { User } from "./user.js";
/**
 * Request payload
 */
export type GetUsersByIdsRequest = {
    userIds: Array<string>;
};
export declare const GetUsersByIdsRequest$zodSchema: z.ZodType<GetUsersByIdsRequest>;
/**
 * Users retrieved successfully
 */
export type GetUsersByIdsResponse = {
    success?: boolean | undefined;
    data?: Array<User> | undefined;
    requestedCount?: number | undefined;
    foundCount?: number | undefined;
};
export declare const GetUsersByIdsResponse$zodSchema: z.ZodType<GetUsersByIdsResponse>;
//# sourceMappingURL=getusersbyidsop.d.ts.map