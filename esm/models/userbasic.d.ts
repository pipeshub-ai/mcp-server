import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const UserBasicAccountType: {
    readonly Individual: "individual";
    readonly Business: "business";
};
export type UserBasicAccountType = ClosedEnum<typeof UserBasicAccountType>;
export declare const UserBasicAccountType$zodSchema: z.ZodEnum<{
    individual: "individual";
    business: "business";
}>;
/**
 * Basic user information
 */
export type UserBasic = {
    _id?: string | undefined;
    email?: string | undefined;
    fullName?: string | undefined;
    orgId?: string | undefined;
    accountType?: UserBasicAccountType | undefined;
};
export declare const UserBasic$zodSchema: z.ZodType<UserBasic>;
//# sourceMappingURL=userbasic.d.ts.map