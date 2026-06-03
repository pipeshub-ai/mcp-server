// Request models for the agent
// endpoints that the vendored SDK does not yet cover:
//   - GET  /agents                                                   (listAgents)
//   - POST /agents/{agentKey}/conversations/stream                   (streamAgentConversation)
//   - POST /agents/{agentKey}/conversations/{conversationId}/messages/stream
//                                                                    (streamAgentConversationMessage)
// Mirrors the shapes in the canonical OpenAPI spec; reuses the existing
// `Filters` model. Unknown fields are stripped server-side, so the shared
// body schema is safe to reuse for both create and follow-up turns.

import * as z from "zod";
import { Filters, Filters$zodSchema } from "./filters.js";

/** Query params for `GET /agents`. */
export type ListAgentsRequest = {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
};

export const ListAgentsRequest$zodSchema: z.ZodType<ListAgentsRequest> = z
  .object({
    page: z.int().optional(),
    limit: z.int().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  });

/**
 * Shared body for the agent conversation stream endpoints. `query` is the
 * only required field; everything else is an optional override / routing hint.
 * `chatMode` for agents is one of `auto | quick | verification | deep`.
 */
export type AgentStreamConversationBody = {
  query: string;
  recordIds?: Array<string> | undefined;
  filters?: Filters | undefined;
  chatMode?: string | undefined;
  modelKey?: string | undefined;
  modelName?: string | undefined;
  modelFriendlyName?: string | undefined;
  tools?: Array<string> | undefined;
  timezone?: string | undefined;
  currentTime?: string | undefined;
};

export const AgentStreamConversationBody$zodSchema: z.ZodType<
  AgentStreamConversationBody
> = z.object({
  query: z.string().min(1),
  recordIds: z.array(z.string()).optional(),
  filters: Filters$zodSchema.optional(),
  chatMode: z.string().optional(),
  modelKey: z.string().optional(),
  modelName: z.string().optional(),
  modelFriendlyName: z.string().optional(),
  tools: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  currentTime: z.string().optional(),
});

/** `POST /agents/{agentKey}/conversations/stream` — path param + body. */
export type AgentStreamCreateConversationRequest = {
  agentKey: string;
  body: AgentStreamConversationBody;
};

export const AgentStreamCreateConversationRequest$zodSchema: z.ZodType<
  AgentStreamCreateConversationRequest
> = z.object({
  agentKey: z.string().min(1),
  body: AgentStreamConversationBody$zodSchema,
});

/**
 * `POST /agents/{agentKey}/conversations/{conversationId}/messages/stream` —
 * two path params + body.
 */
export type AgentAddMessageStreamRequest = {
  agentKey: string;
  conversationId: string;
  body: AgentStreamConversationBody;
};

export const AgentAddMessageStreamRequest$zodSchema: z.ZodType<
  AgentAddMessageStreamRequest
> = z.object({
  agentKey: z.string().min(1),
  conversationId: z.string(),
  body: AgentStreamConversationBody$zodSchema,
});

// ── Response models ──────────────────────────────────────────────────────────
// Validated subsets of the agent responses (only the fields the curated tools
// surface; zod strips the rest). Types are inferred from the schemas.
//
// As of the enriched `GET /agents`, the list item carries `toolsets` and
// `knowledge` directly, so the curated tool no longer needs a per-agent detail
// fetch.

const AgentWebSearch$zodSchema = z.object({
  provider: z.string().optional(),
  providerKey: z.string().optional(),
  providerLabel: z.string().optional(),
});

const AgentToolsetTool$zodSchema = z.object({
  name: z.string().nullish(),
  fullName: z.string().nullish(),
});

const AgentToolset$zodSchema = z.object({
  name: z.string().nullish(),
  displayName: z.string().nullish(),
  instanceName: z.string().nullish(),
  tools: z.array(AgentToolsetTool$zodSchema).default([]),
});

const AgentKnowledge$zodSchema = z.object({
  name: z.string().nullish(),
  displayName: z.string().nullish(),
  type: z.string().nullish(),
});

/**
 * One item of the enriched `GET /agents` list — includes `toolsets` and
 * `knowledge` (the routing-critical capability signal). `default([])` keeps it
 * working against an older list endpoint that doesn't return them.
 */
export const AgentSummary$zodSchema = z.object({
  _key: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  systemPrompt: z.string().nullish(),
  startMessage: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  webSearch: AgentWebSearch$zodSchema.nullish(),
  isActive: z.boolean().nullish(),
  toolsets: z.array(AgentToolset$zodSchema).default([]),
  knowledge: z.array(AgentKnowledge$zodSchema).default([]),
});
export type AgentSummary = z.infer<typeof AgentSummary$zodSchema>;

const AgentListPagination$zodSchema = z.object({
  totalItems: z.number().nullish(),
  total: z.number().nullish(),
  hasNext: z.boolean().nullish(),
  hasNextPage: z.boolean().nullish(),
});

/** Envelope of `GET /agents`. */
export const AgentListEnvelope$zodSchema = z.object({
  success: z.boolean().nullish(),
  agents: z.array(AgentSummary$zodSchema).default([]),
  pagination: AgentListPagination$zodSchema.nullish(),
});
export type AgentListEnvelope = z.infer<typeof AgentListEnvelope$zodSchema>;
