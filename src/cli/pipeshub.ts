// `pipeshub` — a thin CLI over the PipesHub MCP endpoint, built for agent use.
//
// Design constraints worth stating at the top, because they are easy to erode:
//
//   - There is NO way to supply a credential on the command line. No
//     `auth set`, no `auth import`, no `--token`, no `--print-token`. The
//     keychain is the only credential path. A flag that accepts a token would
//     end up in shell history, process listings, and eventually a transcript.
//   - The token is never printed, in any command, in any mode.
//   - Exit codes are contractual: agents branch on them.

import {
  CliError,
  EXIT,
  resolveOrigin,
  resolveToken,
} from "./config.js";
import { newRequestId } from "./client.js";
import {
  ask,
  authStatus,
  connectHelp,
  directoryWhoami,
  get,
  search,
  sources,
  type Ctx,
  type Outcome,
} from "./commands.js";

const USAGE = `pipeshub — query your organization's PipesHub context layer

USAGE
  pipeshub <command> [options]

COMMANDS
  auth status                 show connection, user, org, scopes, expiry
  auth connect-help           print the keychain setup steps
  sources                     list searchable sources (ids for --app)
  search <query>              locate records
  ask <question>              ask a grounded question; returns citations
  get <recordId>              fetch a record's content
  directory whoami            the identity behind the current token

OPTIONS
  --json                      JSON output (default)
  --text                      human-readable output where available
  --limit <n>                 search: max results (default 10)
  --app <id>                  search: restrict to a source id (repeatable)
  --conversation <id>         ask: continue an existing conversation
  --mode <internal|web>       ask: retrieval strategy (default internal)
  --as <format>               get: server-side conversion, e.g. pdf
  --out <path>                get: write to a file instead of stdout
  --max-chars <n>             cap snippet/content length (default 2000)
  --insecure-http             allow cleartext to a host outside the private allowlist

ENVIRONMENT
  PIPESHUB_TOKEN     preferred; PIPESHUB_MCP_TOKEN also accepted
  PIPESHUB_BASE_URL  origin, e.g. https://pipeshub.example.com
                     PIPESHUB_MCP_URL also accepted (its /mcp path is stripped)

EXIT CODES
  0 ok · 2 usage · 3 not authenticated · 4 forbidden · 5 rate limited
  6 no results (also: an 'ask' answer with no citations)

Credentials come from your QM keychain. This CLI cannot accept one as an
argument, by design. Run 'pipeshub auth connect-help' for setup steps.`;

interface Flags {
  json: boolean;
  limit: number;
  apps: string[];
  conversation: string | null;
  mode: string;
  as: string | null;
  out: string | null;
  maxChars: number;
  insecureHttp: boolean;
}

function parseFlags(argv: string[]): { positional: string[]; flags: Flags } {
  const flags: Flags = {
    json: true,
    limit: 10,
    apps: [],
    conversation: null,
    mode: "internal",
    as: null,
    out: null,
    maxChars: 2000,
    insecureHttp: false,
  };
  const positional: string[] = [];

  const needValue = (name: string, value: string | undefined): string => {
    if (value === undefined) {
      throw new CliError(`${name} requires a value`, EXIT.USAGE);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) continue;
    switch (a) {
      case "--json": flags.json = true; break;
      case "--text": flags.json = false; break;
      case "--insecure-http": flags.insecureHttp = true; break;
      case "--limit": flags.limit = Number(needValue(a, argv[++i])); break;
      case "--app": flags.apps.push(needValue(a, argv[++i])); break;
      case "--conversation": flags.conversation = needValue(a, argv[++i]); break;
      case "--mode": flags.mode = needValue(a, argv[++i]); break;
      case "--as": flags.as = needValue(a, argv[++i]); break;
      case "--out": flags.out = needValue(a, argv[++i]); break;
      case "--max-chars": flags.maxChars = Number(needValue(a, argv[++i])); break;
      default:
        if (a.startsWith("--")) {
          // Fail loudly rather than ignoring a flag the caller believed in.
          throw new CliError(`unknown option: ${a}`, EXIT.USAGE);
        }
        positional.push(a);
    }
  }
  if (!Number.isFinite(flags.limit) || flags.limit <= 0) {
    throw new CliError("--limit must be a positive number", EXIT.USAGE);
  }
  if (!Number.isFinite(flags.maxChars) || flags.maxChars <= 0) {
    throw new CliError("--max-chars must be a positive number", EXIT.USAGE);
  }
  return { positional, flags };
}

/** `--mode internal|web` → the tool's `chatMode` vocabulary. */
function resolveChatMode(mode: string): string {
  if (mode === "internal" || mode === "internal_search") return "internal_search";
  if (mode === "web" || mode === "web_search") return "web_search";
  throw new CliError(
    `--mode must be "internal" or "web" (got "${mode}"). The other chatMode `
      + "values the API accepts (quick, verification, deep) are only valid for "
      + "agent conversations, which v1 does not expose.",
    EXIT.USAGE,
  );
}

function emit(outcome: Outcome, json: boolean): void {
  if (!json && outcome.text !== undefined) {
    process.stdout.write(outcome.text + "\n");
    return;
  }
  process.stdout.write(JSON.stringify(outcome.payload, null, 2) + "\n");
}

async function run(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(USAGE + "\n");
    return EXIT.OK;
  }

  const { positional, flags } = parseFlags(argv);
  const command = positional[0] ?? "";
  const sub = positional[1] ?? "";

  // Refuse the credential-mutating shapes explicitly, so the failure explains
  // itself instead of looking like a typo. These names must never work.
  if (command === "auth" && ["set", "import", "login", "add"].includes(sub)) {
    process.stderr.write(
      `pipeshub auth ${sub} does not exist, deliberately.\n`
        + "Credentials come from your QM keychain — run "
        + "'pipeshub auth connect-help' for the steps.\n",
    );
    return EXIT.USAGE;
  }

  const requestId = newRequestId();
  const token = resolveToken();
  const origin = resolveOrigin();

  // connect-help must work with no credential at all — it is the thing you run
  // precisely when you have none.
  if (command === "auth" && sub === "connect-help") {
    const outcome = connectHelp({
      origin: origin ?? "",
      token: "",
      insecureHttp: flags.insecureHttp,
      requestId,
      json: flags.json,
      maxChars: flags.maxChars,
    });
    emit(outcome, flags.json);
    return outcome.exit;
  }

  if (origin === null) {
    throw new CliError(
      "PIPESHUB_BASE_URL is not set. An admin sets it once for the deployment; "
        + "run 'pipeshub auth connect-help' for details.",
      EXIT.USAGE,
    );
  }
  if (token === null) {
    throw new CliError(
      "No PipesHub credential found ($PIPESHUB_TOKEN is unset). "
        + "Run 'pipeshub auth connect-help' for setup steps.",
      EXIT.UNAUTHENTICATED,
    );
  }

  const ctx: Ctx = {
    origin,
    token,
    insecureHttp: flags.insecureHttp,
    requestId,
    json: flags.json,
    maxChars: flags.maxChars,
  };

  let outcome: Outcome;
  switch (command) {
    case "auth":
      if (sub !== "status") {
        throw new CliError(
          `unknown subcommand: auth ${sub || "(none)"}`, EXIT.USAGE,
        );
      }
      outcome = await authStatus(ctx);
      break;
    case "sources":
      outcome = await sources(ctx);
      break;
    case "search": {
      const query = positional.slice(1).join(" ").trim();
      if (query === "") throw new CliError("search requires a query", EXIT.USAGE);
      outcome = await search(ctx, query, flags.limit, flags.apps);
      break;
    }
    case "ask": {
      const query = positional.slice(1).join(" ").trim();
      if (query === "") throw new CliError("ask requires a question", EXIT.USAGE);
      outcome = await ask(ctx, query, flags.conversation, resolveChatMode(flags.mode));
      break;
    }
    case "get": {
      const recordId = positional[1] ?? "";
      if (recordId === "") throw new CliError("get requires a recordId", EXIT.USAGE);
      outcome = await get(ctx, recordId, flags.as, flags.out);
      break;
    }
    case "directory":
      if (sub !== "whoami") {
        throw new CliError(
          "v1 supports 'directory whoami' only. 'groups' needs usergroup:read, "
            + "which is not in the stock MCP_SCOPES and cannot be minted on a "
            + "default instance; 'teams' needs team:read, which the agent "
            + "preset excludes.",
          EXIT.USAGE,
        );
      }
      outcome = await directoryWhoami(ctx);
      break;
    default:
      throw new CliError(`unknown command: ${command}`, EXIT.USAGE);
  }

  emit(outcome, flags.json);
  return outcome.exit;
}

const code = await run(process.argv.slice(2)).catch((e: unknown) => {
  const err = e as CliError;
  const exit = typeof err.code === "number" ? err.code : EXIT.ERROR;
  process.stderr.write(`pipeshub: ${err.message}\n`);
  return exit;
});
process.exit(code);
