import { describe, expect, test } from "bun:test";
import { trimCitations } from "../src/mcp-server/tools/_helpers.js";

// The backend emits citations in two shapes depending on where they are read
// from, and the difference is easy to miss because both are arrays of objects
// of plausible length.
//
//   flat   — `STATE_SNAPSHOT.snapshot.citations[]`
//            { content, chunkIndex, citationType, metadata }
//   nested — `RUN_FINISHED.result.conversation.messages[].citations[]`
//            { citationId, citationData: { content, chunkIndex, metadata } }
//
// `trimConversation` reads the nested one, which is the path the chat tool
// actually returns. Handling only the flat shape produces the right *number*
// of citations with every field `undefined`, so the failure looks like a
// backend that returned nothing useful rather than a mapping bug.

const nested = [
  {
    citationId: "c1",
    citationData: {
      _id: "cd1",
      chunkIndex: 4,
      citationType: "vectordb|document",
      content: "Rotate your credentials on day one.",
      metadata: {
        recordId: "rec-123",
        recordName: "onboarding-checklist",
        mimeType: "text/markdown",
        webUrl: "https://pipeshub.example.com/record/rec-123",
        pageNum: 2,
        blockText: "fallback block text",
      },
    },
  },
];

const flat = [
  {
    chunkIndex: 7,
    citationType: "vectordb|document",
    content: "Flat shape content.",
    metadata: {
      recordId: "rec-456",
      recordName: "security-review",
      mimeType: "application/pdf",
      webUrl: "https://pipeshub.example.com/record/rec-456",
      pageNum: 9,
    },
  },
];

describe("trimCitations", () => {
  test("reads the nested citationData shape", () => {
    const [c] = trimCitations(nested);
    expect(c.recordId).toBe("rec-123");
    expect(c.recordName).toBe("onboarding-checklist");
    expect(c.snippet).toBe("Rotate your credentials on day one.");
    expect(c.mimeType).toBe("text/markdown");
    expect(c.webUrl).toBe("https://pipeshub.example.com/record/rec-123");
    expect(c.pageNum).toBe(2);
    expect(c.chunkIndex).toBe(4);
  });

  // Regression: this is the exact failure the nested shape caused — the
  // citation count was right, every field was gone.
  test("a nested citation does not collapse to an empty object", () => {
    const [c] = trimCitations(nested);
    const populated = Object.values(c).filter((v) => v !== null && v !== undefined);
    expect(populated.length).toBeGreaterThan(1);
  });

  test("still reads the flat shape", () => {
    const [c] = trimCitations(flat);
    expect(c.recordId).toBe("rec-456");
    expect(c.snippet).toBe("Flat shape content.");
    expect(c.chunkIndex).toBe(7);
  });

  test("falls back to metadata.blockText when content is absent", () => {
    const [c] = trimCitations([
      { citationId: "c2", citationData: { metadata: { blockText: "block only" } } },
    ]);
    expect(c.snippet).toBe("block only");
  });

  test("caps the snippet at 280 characters", () => {
    const [c] = trimCitations([
      { citationId: "c3", citationData: { content: "x".repeat(400), metadata: {} } },
    ]);
    expect(c.snippet).toHaveLength(280);
  });

  test("returns [] for a non-array", () => {
    expect(trimCitations(undefined)).toEqual([]);
    expect(trimCitations(null)).toEqual([]);
    expect(trimCitations({} as unknown)).toEqual([]);
  });
});
