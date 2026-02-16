import * as z from "zod";
import { ClosedEnum } from "../types/enums.js";
/**
 * Type of content:
 *
 * @remarks
 * - FILE: Uploaded documents (PDF, DOCX, etc.)
 * - WEBPAGE: Web pages crawled or bookmarked
 * - COMMENT: Comments from collaboration tools
 * - MESSAGE: Chat/messaging content (Slack, Teams)
 * - EMAIL: Email messages (Gmail, Outlook)
 * - TICKET: Support tickets (Jira, ServiceNow)
 * - OTHERS: Miscellaneous content types
 */
export declare const RecordType: {
    readonly File: "FILE";
    readonly Webpage: "WEBPAGE";
    readonly Comment: "COMMENT";
    readonly Message: "MESSAGE";
    readonly Email: "EMAIL";
    readonly Ticket: "TICKET";
    readonly Others: "OTHERS";
};
/**
 * Type of content:
 *
 * @remarks
 * - FILE: Uploaded documents (PDF, DOCX, etc.)
 * - WEBPAGE: Web pages crawled or bookmarked
 * - COMMENT: Comments from collaboration tools
 * - MESSAGE: Chat/messaging content (Slack, Teams)
 * - EMAIL: Email messages (Gmail, Outlook)
 * - TICKET: Support tickets (Jira, ServiceNow)
 * - OTHERS: Miscellaneous content types
 */
export type RecordType = ClosedEnum<typeof RecordType>;
export declare const RecordType$zodSchema: z.ZodEnum<{
    FILE: "FILE";
    WEBPAGE: "WEBPAGE";
    COMMENT: "COMMENT";
    MESSAGE: "MESSAGE";
    EMAIL: "EMAIL";
    TICKET: "TICKET";
    OTHERS: "OTHERS";
}>;
/**
 * Source of the record:
 *
 * @remarks
 * - UPLOAD: Manually uploaded via API/UI
 * - CONNECTOR: Synced from external connector
 */
export declare const Origin: {
    readonly Upload: "UPLOAD";
    readonly Connector: "CONNECTOR";
};
/**
 * Source of the record:
 *
 * @remarks
 * - UPLOAD: Manually uploaded via API/UI
 * - CONNECTOR: Synced from external connector
 */
export type Origin = ClosedEnum<typeof Origin>;
export declare const Origin$zodSchema: z.ZodEnum<{
    CONNECTOR: "CONNECTOR";
    UPLOAD: "UPLOAD";
}>;
/**
 * Name of the source connector
 */
export declare const ConnectorName: {
    readonly Onedrive: "ONEDRIVE";
    readonly GoogleDrive: "GOOGLE_DRIVE";
    readonly Confluence: "CONFLUENCE";
    readonly Jira: "JIRA";
    readonly Slack: "SLACK";
    readonly SharepointOnline: "SHAREPOINT_ONLINE";
    readonly Gmail: "GMAIL";
    readonly Dropbox: "DROPBOX";
    readonly Outlook: "OUTLOOK";
    readonly Servicenow: "SERVICENOW";
    readonly Bookstack: "BOOKSTACK";
    readonly Web: "WEB";
};
/**
 * Name of the source connector
 */
export type ConnectorName = ClosedEnum<typeof ConnectorName>;
export declare const ConnectorName$zodSchema: z.ZodEnum<{
    ONEDRIVE: "ONEDRIVE";
    GOOGLE_DRIVE: "GOOGLE_DRIVE";
    CONFLUENCE: "CONFLUENCE";
    JIRA: "JIRA";
    SLACK: "SLACK";
    SHAREPOINT_ONLINE: "SHAREPOINT_ONLINE";
    GMAIL: "GMAIL";
    DROPBOX: "DROPBOX";
    OUTLOOK: "OUTLOOK";
    SERVICENOW: "SERVICENOW";
    BOOKSTACK: "BOOKSTACK";
    WEB: "WEB";
}>;
/**
 * Current indexing/processing status:
 *
 * @remarks
 * - NOT_STARTED: Awaiting indexing
 * - QUEUED: In indexing queue
 * - IN_PROGRESS: Currently being indexed
 * - COMPLETED: Successfully indexed and searchable
 * - FAILED: Indexing failed (check error details)
 * - PAUSED: Indexing paused by user
 * - FILE_TYPE_NOT_SUPPORTED: Unsupported file format
 * - AUTO_INDEX_OFF: Auto-indexing disabled for this record
 * - EMPTY: File has no extractable content
 * - ENABLE_MULTIMODAL_MODELS: Requires multimodal AI models
 */
export declare const IndexingStatus: {
    readonly NotStarted: "NOT_STARTED";
    readonly Paused: "PAUSED";
    readonly InProgress: "IN_PROGRESS";
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
    readonly FileTypeNotSupported: "FILE_TYPE_NOT_SUPPORTED";
    readonly AutoIndexOff: "AUTO_INDEX_OFF";
    readonly Empty: "EMPTY";
    readonly EnableMultimodalModels: "ENABLE_MULTIMODAL_MODELS";
    readonly Queued: "QUEUED";
};
/**
 * Current indexing/processing status:
 *
 * @remarks
 * - NOT_STARTED: Awaiting indexing
 * - QUEUED: In indexing queue
 * - IN_PROGRESS: Currently being indexed
 * - COMPLETED: Successfully indexed and searchable
 * - FAILED: Indexing failed (check error details)
 * - PAUSED: Indexing paused by user
 * - FILE_TYPE_NOT_SUPPORTED: Unsupported file format
 * - AUTO_INDEX_OFF: Auto-indexing disabled for this record
 * - EMPTY: File has no extractable content
 * - ENABLE_MULTIMODAL_MODELS: Requires multimodal AI models
 */
export type IndexingStatus = ClosedEnum<typeof IndexingStatus>;
export declare const IndexingStatus$zodSchema: z.ZodEnum<{
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
    NOT_STARTED: "NOT_STARTED";
    PAUSED: "PAUSED";
    IN_PROGRESS: "IN_PROGRESS";
    FILE_TYPE_NOT_SUPPORTED: "FILE_TYPE_NOT_SUPPORTED";
    AUTO_INDEX_OFF: "AUTO_INDEX_OFF";
    EMPTY: "EMPTY";
    ENABLE_MULTIMODAL_MODELS: "ENABLE_MULTIMODAL_MODELS";
    QUEUED: "QUEUED";
}>;
/**
 * A record represents a single document, file, or content item within a knowledge base.
 *
 * @remarks
 * Records can originate from file uploads or external connectors (Google Drive, OneDrive, etc.).
 */
export type RecordT = {
    _key?: string | undefined;
    recordName: string;
    externalRecordId?: string | undefined;
    recordType: RecordType;
    origin: Origin;
    connectorId?: string | undefined;
    connectorName?: ConnectorName | undefined;
    orgId: string;
    kbId?: string | undefined;
    folderId?: string | undefined;
    version?: number | undefined;
    createdAtTimestamp?: number | undefined;
    updatedAtTimestamp?: number | undefined;
    indexingStatus?: IndexingStatus | undefined;
    isDeleted?: boolean | undefined;
    isArchived?: boolean | undefined;
    webUrl?: string | undefined;
    mimeType?: string | undefined;
    sizeInBytes?: number | undefined;
    extension?: string | undefined;
    sha256Hash?: string | undefined;
};
export declare const RecordT$zodSchema: z.ZodType<RecordT>;
//# sourceMappingURL=record.d.ts.map