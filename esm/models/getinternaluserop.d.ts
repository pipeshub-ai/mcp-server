import * as z from "zod";
import { User } from "./user.js";
export type GetInternalUserSecurity = {
    scopedToken: string;
};
export declare const GetInternalUserSecurity$zodSchema: z.ZodType<GetInternalUserSecurity>;
export type GetInternalUserRequest = {
    id: string;
};
export declare const GetInternalUserRequest$zodSchema: z.ZodType<GetInternalUserRequest>;
/**
 * User retrieved successfully
 */
export type GetInternalUserResponse = {
    success?: boolean | undefined;
    data?: User | undefined;
};
export declare const GetInternalUserResponse$zodSchema: z.ZodType<GetInternalUserResponse>;
//# sourceMappingURL=getinternaluserop.d.ts.map