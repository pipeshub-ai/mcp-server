import * as z from "zod";
export type GetAllUsersRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const GetAllUsersRequest$zodSchema: z.ZodType<GetAllUsersRequest>;
//# sourceMappingURL=getallusersop.d.ts.map