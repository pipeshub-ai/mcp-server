import * as z from "zod";
/**
 * Request to save filter selections for a connector
 */
export type SaveConnectorFiltersRequest = {
    filters: {
        [k: string]: any;
    };
};
export declare const SaveConnectorFiltersRequest$zodSchema: z.ZodType<SaveConnectorFiltersRequest>;
//# sourceMappingURL=saveconnectorfiltersrequest.d.ts.map