import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
export declare const CreateDocumentPlaceholderPermissions: {
    readonly Owner: "owner";
    readonly Editor: "editor";
    readonly Commentator: "commentator";
    readonly Readonly: "readonly";
};
export type CreateDocumentPlaceholderPermissions = ClosedEnum<typeof CreateDocumentPlaceholderPermissions>;
export declare const CreateDocumentPlaceholderPermissions$zodSchema: z.ZodEnum<{
    readonly: "readonly";
    owner: "owner";
    editor: "editor";
    commentator: "commentator";
}>;
/**
 * Custom metadata key-value pairs
 */
export type CreateDocumentPlaceholderMetaData = {};
export declare const CreateDocumentPlaceholderMetaData$zodSchema: z.ZodType<CreateDocumentPlaceholderMetaData>;
/**
 * Request payload
 */
export type CreateDocumentPlaceholderRequest = {
    documentName: string;
    alternateDocumentName?: string | undefined;
    documentPath: string;
    permissions?: CreateDocumentPlaceholderPermissions | undefined;
    metaData?: CreateDocumentPlaceholderMetaData | undefined;
    isVersionedFile?: boolean | undefined;
    extension: string;
};
export declare const CreateDocumentPlaceholderRequest$zodSchema: z.ZodType<CreateDocumentPlaceholderRequest>;
//# sourceMappingURL=createdocumentplaceholderop.d.ts.map