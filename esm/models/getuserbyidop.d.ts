import * as z from "zod";
import { User } from "./user.js";
export type GetUserByIdRequest = {
    id: string;
};
export declare const GetUserByIdRequest$zodSchema: z.ZodType<GetUserByIdRequest>;
/**
 * User details retrieved successfully
 */
export type GetUserByIdResponse = {
    success?: boolean | undefined;
    data?: User | undefined;
};
export declare const GetUserByIdResponse$zodSchema: z.ZodType<GetUserByIdResponse>;
//# sourceMappingURL=getuserbyidop.d.ts.map