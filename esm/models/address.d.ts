import * as z from "zod";
export type Address = {
    addressLine1?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postCode?: string | undefined;
    country?: string | undefined;
};
export declare const Address$zodSchema: z.ZodType<Address>;
//# sourceMappingURL=address.d.ts.map