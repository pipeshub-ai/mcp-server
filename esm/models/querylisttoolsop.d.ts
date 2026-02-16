import * as z from "zod";
export declare const QueryListToolsOpServerList: readonly ["http://localhost:8000"];
/**
 * Tool parameter definitions
 */
export type ParametersT = {};
export declare const ParametersT$zodSchema: z.ZodType<ParametersT>;
export type QueryListToolsResponse = {
    name?: string | undefined;
    description?: string | undefined;
    parameters?: ParametersT | undefined;
    tags?: Array<string> | undefined;
};
export declare const QueryListToolsResponse$zodSchema: z.ZodType<QueryListToolsResponse>;
//# sourceMappingURL=querylisttoolsop.d.ts.map