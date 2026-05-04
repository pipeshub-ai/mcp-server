import * as z from "zod";
import { CitationMetadata } from "./citationmetadata.js";
/**
 * A single citation attached to a `bot_response` message. Each citation
 *
 * @remarks
 * points back to a chunk of a source record that the AI used while
 * answering.<br><br>
 * <b>Shape on the wire:</b> the API returns a populated Citation document
 * with `_id`, `content` (the chunk text), `chunkIndex`, `citationType`,
 * timestamps, and a `metadata` object that carries the record-level
 * identity (most importantly <code>metadata.recordId</code> and
 * <code>metadata.recordName</code>).<br><br>
 * <b>Discovering a recordId for download:</b> when a programmatic / MCP
 * caller wants to download a file mentioned in the chat, read
 * <code>citations[*].metadata.recordId</code> from the
 * <code>complete</code> SSE frame and pass it to
 * <code>GET /knowledgeBase/stream/record/{recordId}</code>.
 */
export type CitationReference = {
    _id?: string | undefined;
    content?: string | undefined;
    chunkIndex?: number | undefined;
    citationType?: string | undefined;
    metadata?: CitationMetadata | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
};
export declare const CitationReference$zodSchema: z.ZodType<CitationReference>;
//# sourceMappingURL=citationreference.d.ts.map