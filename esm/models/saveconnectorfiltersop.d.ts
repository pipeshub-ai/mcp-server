import * as z from "zod";
import { SaveConnectorFiltersRequest } from "./saveconnectorfiltersrequest.js";
export type SaveConnectorFiltersRequestRequest = {
    connectorId: string;
    body: SaveConnectorFiltersRequest;
};
export declare const SaveConnectorFiltersRequestRequest$zodSchema: z.ZodType<SaveConnectorFiltersRequestRequest>;
/**
 * Filters saved
 */
export type SaveConnectorFiltersResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
};
export declare const SaveConnectorFiltersResponse$zodSchema: z.ZodType<SaveConnectorFiltersResponse>;
//# sourceMappingURL=saveconnectorfiltersop.d.ts.map