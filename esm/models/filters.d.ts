import * as z from "zod";
/**
 * Source-scoping for a chat turn. **All scoping ids go in `apps`** —
 *
 * @remarks
 * both connector instance UUIDs (e.g. a specific Box / Drive / Confluence
 * connection) and the synthetic knowledge-base id
 * `knowledgeBase_<orgId>` (used to include the org's knowledge base
 * as a source). The separate `kb` field is preserved for
 * backwards-compat but the server-side flow funnels everything
 * through `apps`; leave `kb` as `[]`.<br><br>
 * **NOT connector type names** — do NOT pass `"drive"`, `"gmail"`,
 * etc. Get connector instance UUIDs from
 * `GET /connectors/active` (field `_id`).<br><br>
 * For **org assistant** chats, send explicit `apps` lists. For
 * **agent** chats, send explicit id lists, or **omit** `filters`
 * (and `tools`) to let the service use the agent's stored knowledge
 * and tool configuration. Sending `{ "apps": [], "kb": [] }` on an
 * agent chat means **no** knowledge sources for that turn (it is
 * not "full org default").
 */
export type Filters = {
    apps?: Array<string> | undefined;
    kb?: Array<string> | undefined;
};
export declare const Filters$zodSchema: z.ZodType<Filters>;
//# sourceMappingURL=filters.d.ts.map