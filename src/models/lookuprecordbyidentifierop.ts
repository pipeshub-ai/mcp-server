/*
 * Adapted from Speakeasy-generated lookuprecordbyidentifierop.
 *
 * Request only. The generated file also declared a `LookupRecordByIdentifierResponse`
 * union, which pulls in further response models; the func returns a raw `Response`
 * (errorCodes: []) and the tool parses it with `readJson`, so none of that is used
 * here.
 */

import * as z from "zod";

export type LookupRecordByIdentifierRequest = {
  identifiers: Array<string>;
  connectorName?: string | undefined;
};

export const LookupRecordByIdentifierRequest$zodSchema: z.ZodType<
  LookupRecordByIdentifierRequest
> = z.object({
  connectorName: z.string().describe(
    "Connector hint to prioritise resolution order, e.g. `JIRA`, `CONFLUENCE`, `GOOGLE_DRIVE`, `SLACK`. Cannot widen beyond the connectors the caller can access.",
  ).optional(),
  identifiers: z.array(z.string().min(1).max(2048)).min(1).max(10).describe(
    "The references to resolve: URLs, issue keys such as `PA-1787`, or bare external system IDs. Paste each exactly as you found it — tracking parameters and fragments are handled. Up to 10 per call.",
  ),
});
