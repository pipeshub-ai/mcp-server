import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Filter input type
 */
export declare const FilterOptionsType: {
    readonly Select: "select";
    readonly Multiselect: "multiselect";
    readonly Text: "text";
    readonly Boolean: "boolean";
};
/**
 * Filter input type
 */
export type FilterOptionsType = ClosedEnum<typeof FilterOptionsType>;
export declare const FilterOptionsType$zodSchema: z.ZodEnum<{
    boolean: "boolean";
    select: "select";
    multiselect: "multiselect";
    text: "text";
}>;
export type Option = {
    id?: string | undefined;
    value?: string | undefined;
    label?: string | undefined;
};
export declare const Option$zodSchema: z.ZodType<Option>;
export type Filter = {
    key?: string | undefined;
    label?: string | undefined;
    type?: FilterOptionsType | undefined;
    options?: Array<Option> | undefined;
    dynamic?: boolean | undefined;
};
export declare const Filter$zodSchema: z.ZodType<Filter>;
/**
 * Available filter options for a connector
 */
export type FilterOptions = {
    filters?: Array<Filter> | undefined;
};
export declare const FilterOptions$zodSchema: z.ZodType<FilterOptions>;
//# sourceMappingURL=filteroptions.d.ts.map