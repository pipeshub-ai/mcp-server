import * as z from "zod";
export type GetUserTeamsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    created_by?: string | undefined;
    created_after?: number | undefined;
    created_before?: number | undefined;
};
export declare const GetUserTeamsRequest$zodSchema: z.ZodType<GetUserTeamsRequest>;
//# sourceMappingURL=getuserteamsop.d.ts.map