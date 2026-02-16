import * as z from "zod";
import { Document } from "./document.js";
/**
 * Request payload
 */
export type RollBackToPreviousVersionRequestBody = {
    version: string;
    note: string;
};
export declare const RollBackToPreviousVersionRequestBody$zodSchema: z.ZodType<RollBackToPreviousVersionRequestBody>;
export type RollBackToPreviousVersionRequest = {
    documentId: string;
    body: RollBackToPreviousVersionRequestBody;
};
export declare const RollBackToPreviousVersionRequest$zodSchema: z.ZodType<RollBackToPreviousVersionRequest>;
/**
 * Document rolled back successfully
 */
export type RollBackToPreviousVersionResponse = {
    success?: boolean | undefined;
    message?: string | undefined;
    data?: Document | undefined;
};
export declare const RollBackToPreviousVersionResponse$zodSchema: z.ZodType<RollBackToPreviousVersionResponse>;
//# sourceMappingURL=rollbacktopreviousversionop.d.ts.map