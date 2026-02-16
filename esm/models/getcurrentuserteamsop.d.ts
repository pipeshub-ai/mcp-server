import * as z from "zod";
export type GetCurrentUserTeamsRequest = {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
};
export declare const GetCurrentUserTeamsRequest$zodSchema: z.ZodType<GetCurrentUserTeamsRequest>;
//# sourceMappingURL=getcurrentuserteamsop.d.ts.map