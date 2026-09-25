// A stand-in for a PipesHub instance's `/mcp` endpoint, on loopback only.
// It answers `tools/call` the way the real endpoint does (one SSE `message`
// event carrying the JSON-RPC response) and records what each request carried,
// so a test can check the bearer and request id that actually went over the wire.

export interface SeenCall {
  path: string;
  authorization: string | null;
  requestId: string | null;
  method: string;
  tool: string | undefined;
  args: Record<string, unknown> | undefined;
}

export type Reply =
  | { content: Array<Record<string, unknown>>; isError?: boolean }
  | { status: number; body?: string }
  | { rpcError: string };

export interface FakeMcp {
  origin: string;
  calls: SeenCall[];
  /** Set what the next tools/call for `tool` returns. */
  reply(tool: string, r: Reply): void;
  stop(): void;
}

export const textReply = (value: unknown): Reply => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
});

export function startFakeMcp(): FakeMcp {
  const replies = new Map<string, Reply>();
  const calls: SeenCall[] = [];

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body = (await req.json()) as {
        id?: number;
        method: string;
        params?: { name?: string; arguments?: Record<string, unknown> };
      };
      const tool = body.params?.name;
      calls.push({
        path: new URL(req.url).pathname,
        authorization: req.headers.get("authorization"),
        requestId: req.headers.get("x-pipeshub-request-id"),
        method: body.method,
        tool,
        args: body.params?.arguments,
      });
      const r = replies.get(tool ?? "") ?? textReply({});
      if ("status" in r) return new Response(r.body ?? "", { status: r.status });
      const message = "rpcError" in r
        ? { jsonrpc: "2.0", id: body.id, error: { code: -32000, message: r.rpcError } }
        : { jsonrpc: "2.0", id: body.id, result: r };
      return new Response(`event: message\ndata: ${JSON.stringify(message)}\n\n`, {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });

  return {
    origin: `http://127.0.0.1:${server.port}`,
    calls,
    reply: (tool, r) => void replies.set(tool, r),
    stop: () => void server.stop(true),
  };
}
