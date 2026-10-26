// `pipeshub` — a thin CLI over the PipesHub MCP endpoint, built for agent use.
//
// Design constraints worth stating at the top, because they are easy to erode:
//
//   - There is NO way to supply a credential on the command line. No
//     `auth set`, no `auth import`, no `--token`, no `--print-token`. A token
//     comes from the environment (the QM keychain) or from `pipeshub login`,
//     which gets one from the browser and stores it in a 0600 file. A flag
//     that accepts a token would end up in shell history, process listings,
//     and eventually a transcript.
//   - The token is never printed, in any command, in any mode.
//   - Exit codes are contractual: agents branch on them.

import {
  CliError,
  EXIT,
  describeToken,
  resolveOrigin,
  resolveToken,
} from "./config.js";
import { newRequestId } from "./client.js";
import { initQm, renderInitReport } from "./init-qm.js";
import { MCP_CLIENTS, mcpInstall, type McpClient } from "./mcp-install.js";
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
import { collectionCreate, connectSource, indexingStatus, upload } from "./write-commands.js";
import { packsAdd, packsEmbedding, packsList, packsRemove } from "./packs.js";
import { init, renderReport } from "./standalone/init.js";
import { indexCommand } from "./standalone/index.js";
import { DEFAULT_PORT, DEFAULT_PROJECT, devDown, devStatus, devUp } from "./standalone/stack.js";
import { CLIENT_IDS } from "./standalone/clients.js";
import {
  CLOUD_ORIGIN,
  credentialsPath,
  logout,
  readPending,
  startLogin,
  storedLogin,
  waitForLogin,
  type PendingLogin,
  type StoredLogin,
} from "./login.js";

const USAGE = `pipeshub — query your organization's PipesHub context layer

USAGE
  pipeshub <command> [options]

COMMANDS
  login [--url <origin>]      sign in from the browser (default PipesHub Cloud)
  logout                      sign out and forget the stored sign-in
  auth status                 show connection, user, org, scopes, expiry
  auth connect-help           print the keychain setup steps
  init-qm <dir>               scaffold the QM deployment-layer bundle (admin)
  sources                     list searchable sources (ids for --app / --kb)
  search <query>              locate records
  ask <question>              ask a grounded question; returns citations
  get <recordId>              fetch a record's content
  directory whoami            the identity behind the current token
  collection create <name>    create a collection to upload into
  upload <collectionId> <path>...
                              upload files or folders (walked) to a collection
  status <collectionId>       indexing progress of a collection
  connect [connector]         link to connect a source, e.g. connect Jira
  mcp install --client <name> add PipesHub to an MCP client, with no token in its config:
                              claude-code, cursor, codex, gemini, claude-desktop
  init                        set up PipesHub on this computer for your coding agents:
                              start the local stack (Docker), sign in on loopback, and
                              write each detected agent's MCP entry and instructions
  uninstall                   undo init (same as init --uninstall)
  dev up|down|status          start, stop or inspect the local PipesHub (Docker Compose)
  index [path]                push a git repository into the code graph (--watch to follow it)
  packs list                  optional packs (web browser, document converter, embedding models) and their state
  packs add <id>              install a pack; --wait follows the download (the default in a terminal)
  packs remove <id>           remove a pack (asks first in a terminal; --yes skips it)
  packs embedding [<model>]   show the embedding model, or switch to <model> (--builtin: the built-in one)

OPTIONS
  --json                      JSON output (default)
  --text                      human-readable output where available
  --limit <n>                 search: result limit, 1-100 (default 10)
  --app <id>                  search: restrict to a connector id (repeatable)
  --kb <id>                   search: restrict to a collection id (repeatable)
  --offset <n>                search: skip n records (a previous nextOffset)
  --conversation <id>         ask: continue an existing conversation
  --as <format>               get: server-side conversion, e.g. pdf
  --out <path>                get: write to a file instead of stdout
  --max-chars <n>             cap snippet/content length (default 2000)
  --insecure-http             allow cleartext to a host outside the private allowlist
  --force                     init-qm: overwrite files that already exist;
                              mcp install: replace an existing pipeshub entry
  --client <name>             mcp install: the client to configure
  --dry-run                   mcp install, init: show what would change, change nothing
  --yes, -y                   init: never ask; take the defaults
  --uninstall                 init: remove everything init added
  --project                   init: also write this repository's AGENTS.md / CLAUDE.md block and rule files
  --port <n>                  init, dev up: port of the local stack (default 3000)
  --no-start                  init: do not start the stack; fail if none is running
  --no-index                  init: do not index the git repository it is run in
  --volumes                   dev down: also delete the stack's data
  --watch                     index: keep the index current as files change
  --url <origin>              login: the PipesHub to sign in to
  --no-wait                   login: print the code and link, then exit
  --wait                      login: finish a sign-in started with --no-wait; packs: follow progress
  --file <path>               packs add: install from an archive at this path on the PipesHub server
  --use                       packs add: after installing an embedding pack, switch search to it
  --builtin                   packs embedding: switch back to the built-in model

ENVIRONMENT
  PIPESHUB_TOKEN     preferred over a stored login; PIPESHUB_MCP_TOKEN also accepted
  PIPESHUB_BASE_URL  origin, e.g. https://pipeshub.example.com
                     PIPESHUB_MCP_URL also accepted (its /mcp path is stripped)

EXIT CODES
  0 ok · 2 usage · 3 not authenticated · 4 forbidden · 5 rate limited
  6 no results (also: an 'ask' answer with no citations)

Credentials come from 'pipeshub login' or the environment (in QM, your
keychain). This CLI cannot accept one as an argument, by design. In QM, run
'pipeshub auth connect-help' for setup steps.`;

interface Flags {
  json: boolean;
  limit: number;
  apps: string[];
  kb: string[];
  offset: number;
  conversation: string | null;
  as: string | null;
  out: string | null;
  maxChars: number;
  insecureHttp: boolean;
  force: boolean;
  url: string | null;
  wait: boolean | null;
  client: string | null;
  /** Every --client given (init takes several). */
  clients: string[];
  dryRun: boolean;
  /** --json / --text was typed, as opposed to the default. */
  formatChosen: boolean;
  yes: boolean;
  uninstall: boolean;
  project: boolean;
  port: number;
  noStart: boolean;
  noIndex: boolean;
  volumes: boolean;
  watch: boolean;
  file: string | null;
  use: boolean;
  builtin: boolean;
}

function parseFlags(argv: string[]): { positional: string[]; flags: Flags } {
  const flags: Flags = {
    json: true,
    limit: 10,
    apps: [],
    kb: [],
    offset: 0,
    conversation: null,
    as: null,
    out: null,
    maxChars: 2000,
    insecureHttp: false,
    force: false,
    url: null,
    wait: null,
    client: null,
    clients: [],
    dryRun: false,
    formatChosen: false,
    yes: false,
    uninstall: false,
    project: false,
    port: DEFAULT_PORT,
    noStart: false,
    noIndex: false,
    volumes: false,
    watch: false,
    file: null,
    use: false,
    builtin: false,
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
      case "--json": flags.json = true; flags.formatChosen = true; break;
      case "--text": flags.json = false; flags.formatChosen = true; break;
      case "--yes": case "-y": flags.yes = true; break;
      case "--uninstall": flags.uninstall = true; break;
      case "--project": flags.project = true; break;
      case "--no-start": flags.noStart = true; break;
      case "--no-index": flags.noIndex = true; break;
      case "--volumes": flags.volumes = true; break;
      case "--watch": flags.watch = true; break;
      case "--use": flags.use = true; break;
      case "--builtin": flags.builtin = true; break;
      case "--file": flags.file = needValue(a, argv[++i]); break;
      case "--port": flags.port = Number(needValue(a, argv[++i])); break;
      case "--insecure-http": flags.insecureHttp = true; break;
      case "--force": flags.force = true; break;
      case "--wait": flags.wait = true; break;
      case "--no-wait": flags.wait = false; break;
      case "--url": flags.url = needValue(a, argv[++i]); break;
      case "--client": flags.client = needValue(a, argv[++i]); flags.clients.push(...flags.client.split(",").filter(Boolean)); break;
      case "--dry-run": flags.dryRun = true; break;
      case "--limit": flags.limit = Number(needValue(a, argv[++i])); break;
      case "--app": flags.apps.push(needValue(a, argv[++i])); break;
      case "--kb": flags.kb.push(needValue(a, argv[++i])); break;
      case "--offset": flags.offset = Number(needValue(a, argv[++i])); break;
      case "--conversation": flags.conversation = needValue(a, argv[++i]); break;
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
  // The tool rejects anything outside 1-100; catching it here makes it a usage
  // error (exit 2) instead of a generic tool failure.
  if (!Number.isInteger(flags.limit) || flags.limit < 1 || flags.limit > 100) {
    throw new CliError("--limit must be a whole number from 1 to 100", EXIT.USAGE);
  }
  if (!Number.isInteger(flags.offset) || flags.offset < 0) {
    throw new CliError("--offset must be a whole number of 0 or more", EXIT.USAGE);
  }
  if (!Number.isInteger(flags.port) || flags.port < 1 || flags.port > 65535) {
    throw new CliError("--port must be a whole number from 1 to 65535", EXIT.USAGE);
  }
  if (!Number.isFinite(flags.maxChars) || flags.maxChars <= 0) {
    throw new CliError("--max-chars must be a positive number", EXIT.USAGE);
  }
  return { positional, flags };
}

/**
 * Write and wait for the bytes to actually reach the pipe.
 *
 * `process.stdout` is asynchronous when it is a pipe — which is the normal
 * case here, since the caller is an agent capturing output. `process.exit()`
 * does not flush it, so a payload larger than the pipe buffer is silently cut
 * off (measured: a 2,000,015-byte write delivered 1,048,576 bytes) while the
 * exit code still reports success. The consumer then parses truncated JSON.
 *
 * The `write` callback fires once the chunk has been handed to the underlying
 * resource, so exiting after it is safe — and unlike setting `process.exitCode`
 * and returning, it does not wait on undici's keep-alive sockets.
 */
function writeFlushed(stream: NodeJS.WriteStream, text: string): Promise<void> {
  return new Promise((resolve) => {
    stream.write(text, () => resolve());
  });
}

function emit(outcome: Outcome, json: boolean): Promise<void> {
  if (!json && outcome.text !== undefined) {
    return writeFlushed(process.stdout, outcome.text + "\n");
  }
  return writeFlushed(
    process.stdout,
    JSON.stringify(outcome.payload, null, 2) + "\n",
  );
}

/** Every command word. An unknown one is a usage error before any credential or sandbox check, so a typo never looks like an auth problem. */
export const COMMANDS = [
  "login", "logout", "auth", "init-qm", "sources", "search", "ask", "get", "collection", "upload", "status",
  "mcp", "connect", "directory", "init", "uninstall", "dev", "index", "packs",
] as const;

/** y/N on stderr, read from stdin. */
async function confirm(question: string): Promise<boolean> {
  const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stderr });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

const progress = (s: string) => writeFlushed(process.stderr, s + "\n");

async function run(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    await writeFlushed(process.stdout, USAGE + "\n");
    return EXIT.OK;
  }

  const { positional, flags } = parseFlags(argv);
  const command = positional[0] ?? "";
  const sub = positional[1] ?? "";

  // Refuse the credential-mutating shapes explicitly, so the failure explains
  // itself instead of looking like a typo. These names must never work.
  if (command === "auth" && ["set", "import", "add"].includes(sub)) {
    await writeFlushed(
      process.stderr,
      `pipeshub auth ${sub} does not exist, deliberately.\n`
        + "Run 'pipeshub login' to sign in from the browser, or in QM "
        + "'pipeshub auth connect-help' for the keychain steps.\n",
    );
    return EXIT.USAGE;
  }

  if (!(COMMANDS as readonly string[]).includes(command)) {
    throw new CliError(`unknown command: ${command}. Run 'pipeshub --help' for the list.`, EXIT.USAGE);
  }

  const requestId = newRequestId();

  // These need no credential (or make their own), so they run before the check below.
  if (command === "init" || command === "uninstall") {
    const { exit, report } = await init({
      dryRun: flags.dryRun,
      yes: flags.yes,
      uninstall: flags.uninstall || command === "uninstall",
      force: flags.force,
      project: flags.project,
      clients: flags.clients,
      url: flags.url,
      port: flags.port,
      noStart: flags.noStart,
      index: !flags.noIndex,
      email: "developer@pipeshub.local",
      cwd: process.cwd(),
    }, process.env, (s) => void progress(s));
    await writeFlushed(process.stdout, flags.formatChosen && flags.json
      ? JSON.stringify({ requestId, ...report }, null, 2) + "\n"
      : renderReport(report) + "\n");
    return exit;
  }
  if (command === "dev") {
    if (sub === "status") {
      await writeFlushed(process.stdout, JSON.stringify({ requestId, ...(await devStatus()) }, null, 2) + "\n");
      return EXIT.OK;
    }
    if (sub === "up") {
      const state = await devUp({ port: flags.port, project: process.env["PIPESHUB_PROJECT"] || DEFAULT_PROJECT, waitSeconds: 600 }, process.env, (s) => void progress(s));
      await writeFlushed(process.stdout, JSON.stringify({ requestId, ...state, next: "pipeshub init" }, null, 2) + "\n");
      return EXIT.OK;
    }
    if (sub === "down") {
      const out = await devDown(flags.volumes);
      await writeFlushed(process.stdout, JSON.stringify({ requestId, ...out }, null, 2) + "\n");
      return EXIT.OK;
    }
    throw new CliError("usage: pipeshub dev up|down|status", EXIT.USAGE);
  }
  if (command === "index") {
    const out = await indexCommand({ path: positional[1] ?? ".", watch: flags.watch }, process.env, (s) => void progress(s));
    await writeFlushed(process.stdout, JSON.stringify({ requestId, ...out.payload }, null, 2) + "\n");
    return out.exit;
  }
  // `mcp install` writes a config file: it needs the origin to point at, but never a token, and --dry-run touches nothing.
  if (command === "mcp") {
    if (sub !== "install" || flags.client === null) {
      throw new CliError(`usage: pipeshub mcp install --client <${MCP_CLIENTS.join("|")}>`, EXIT.USAGE);
    }
    if (!(MCP_CLIENTS as readonly string[]).includes(flags.client)) {
      const more = (CLIENT_IDS as readonly string[]).includes(flags.client)
        ? ` (${flags.client} is set up by 'pipeshub init --client ${flags.client}')` : "";
      throw new CliError(`unknown --client ${flags.client}; one of ${MCP_CLIENTS.join(", ")}${more}`, EXIT.USAGE);
    }
    const origin = resolveOrigin() ?? (await storedLogin(null, flags.insecureHttp))?.origin ?? null;
    if (origin === null) {
      throw new CliError("no PipesHub address: set PIPESHUB_BASE_URL, or run 'pipeshub init' (local) or 'pipeshub login --url <origin>'.", EXIT.USAGE);
    }
    const result = await mcpInstall(flags.client as McpClient, origin, { force: flags.force, dryRun: flags.dryRun });
    await emit({
      exit: EXIT.OK,
      payload: {
        requestId,
        ...result,
        note: "This entry carries no token. It works once you run 'pipeshub login' for this origin.",
      },
      text: `${flags.dryRun ? "Would add" : "Added"} PipesHub to ${flags.client}`
        + `${result.wrote ? ` (${result.wrote})` : ""}. ${result.next}.`,
    }, flags.json);
    return EXIT.OK;
  }

  let token = resolveToken();
  let origin = resolveOrigin();

  if (command === "login" || (command === "auth" && sub === "login")) {
    if (flags.url !== null) {
      // A blank --url (an unset variable) must not fall through to Cloud.
      origin = resolveOrigin({ PIPESHUB_BASE_URL: flags.url });
      if (origin === null) throw new CliError("--url needs an origin, e.g. https://pipeshub.example.com", EXIT.USAGE);
    }
    return login(origin, flags, requestId);
  }
  if (command === "logout") {
    const out = await logout(flags.insecureHttp);
    await emit({
      exit: EXIT.OK,
      payload: { requestId, loggedOut: true, origin: out.origin, revokeRequested: out.revokeRequested },
      text: out.origin
        ? `Signed out of ${out.origin}: the stored sign-in is deleted${out.revokeRequested ? " and the server was asked to revoke it" : ""}.`
        : "No stored sign-in.",
    }, flags.json);
    return EXIT.OK;
  }

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
    await emit(outcome, flags.json);
    return outcome.exit;
  }

  // Scaffolding is an admin task performed before any credential exists, so it
  // runs before the token and base-URL checks.
  if (command === "init-qm") {
    const dir = positional[1] ?? "";
    if (dir === "") {
      throw new CliError("init-qm requires a target directory", EXIT.USAGE);
    }
    const result = await initQm(dir, flags.force);
    const report = renderInitReport(dir, result);
    if (flags.json) {
      await writeFlushed(process.stdout, JSON.stringify({
        requestId,
        target: dir,
        version: result.version,
        written: result.written,
        skipped: result.skipped,
        dockerfile: result.dockerfileAction,
        dockerfileSkipReason: result.skipReason,
        staleDockerfile: result.staleDockerfile,
      }, null, 2) + "\n");
    } else {
      await writeFlushed(process.stdout, report + "\n");
    }
    return EXIT.OK;
  }

  // The environment wins; a stored login is used only for its own origin.
  let source: string | undefined;
  if (token === null) {
    const stored = await storedLogin(origin, flags.insecureHttp);
    if (stored) {
      token = stored.accessToken;
      origin ??= stored.origin;
      source = "pipeshub login";
    }
  }

  if (origin === null) {
    // Report the missing credential too when both are absent. Otherwise a
    // person whose actual problem is "I never added my token" is told about a
    // missing URL, and goes looking in the wrong place.
    const alsoNoToken = token === null
      ? " Your PipesHub credential is also missing ($PIPESHUB_TOKEN is unset)."
      : "";
    throw new CliError(
      "PIPESHUB_BASE_URL is not set — it must reach the sandbox as an env var "
        + "(keychain or org service credential, not sandbox.env)."
        + alsoNoToken
        + " Run 'pipeshub auth connect-help' for the steps. Outside QM, run "
        + "'pipeshub login' to sign in from the browser.",
      EXIT.USAGE,
    );
  }
  if (token === null) {
    throw new CliError(
      "No PipesHub credential found ($PIPESHUB_TOKEN is unset). "
        + "Run 'pipeshub auth connect-help' for setup steps, or outside QM "
        + `'pipeshub login --url ${origin}'.`,
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
    ...(source ? { tokenSource: source } : {}),
  };

  let outcome: Outcome;
  let packsJson = false;
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
      outcome = await search(
        ctx,
        query,
        flags.limit,
        flags.apps,
        flags.kb,
        flags.offset,
      );
      break;
    }
    case "ask": {
      const query = positional.slice(1).join(" ").trim();
      if (query === "") throw new CliError("ask requires a question", EXIT.USAGE);
      outcome = await ask(ctx, query, flags.conversation);
      break;
    }
    case "get": {
      const recordId = positional[1] ?? "";
      if (recordId === "") throw new CliError("get requires a recordId", EXIT.USAGE);
      outcome = await get(ctx, recordId, flags.as, flags.out);
      break;
    }
    case "collection": {
      const name = positional.slice(2).join(" ").trim();
      if (sub !== "create" || name === "") {
        throw new CliError("usage: pipeshub collection create <name>", EXIT.USAGE);
      }
      outcome = await collectionCreate(ctx, name);
      break;
    }
    case "upload": {
      const [, collectionId = "", ...paths] = positional;
      if (collectionId === "" || paths.length === 0) {
        throw new CliError("usage: pipeshub upload <collectionId> <path>...", EXIT.USAGE);
      }
      outcome = await upload(ctx, collectionId, paths);
      break;
    }
    case "status": {
      const collectionId = positional[1] ?? "";
      if (collectionId === "") throw new CliError("usage: pipeshub status <collectionId>", EXIT.USAGE);
      outcome = await indexingStatus(ctx, collectionId);
      break;
    }
    case "connect":
      outcome = await connectSource(ctx, positional.slice(1).join(" ").trim() || undefined);
      break;
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
    case "packs": {
      // Text by default, like init; --json prints the API's answer.
      packsJson = flags.formatChosen && flags.json;
      const tty = process.stdout.isTTY === true;
      const o = { say: (s: string) => void progress(s), confirm, wait: flags.wait ?? tty };
      const id = positional[2] ?? "";
      if (sub === "list" || sub === "ls") outcome = await packsList(ctx);
      else if (sub === "add" || sub === "remove" || sub === "rm") {
        if (id === "") throw new CliError(`usage: pipeshub packs ${sub} <id>`, EXIT.USAGE);
        outcome = sub === "add" ? await packsAdd(ctx, id, flags.file, flags.use, o) : await packsRemove(ctx, id, flags.yes || !tty, o);
      } else if (sub === "embedding") outcome = await packsEmbedding(ctx, positional[2] ?? null, flags.builtin, o);
      else throw new CliError("usage: pipeshub packs list|add <id>|remove <id>|embedding [<model>|--builtin]", EXIT.USAGE);
      break;
    }
    default:
      throw new CliError(`unknown command: ${command}`, EXIT.USAGE);
  }

  await emit(outcome, command === "packs" ? packsJson : flags.json);
  return outcome.exit;
}

async function login(origin: string | null, flags: Flags, requestId: string): Promise<number> {
  let pending: PendingLogin | null;
  if (flags.wait === true) {
    pending = await readPending();
    if (pending === null) {
      throw new CliError("No sign-in in progress. Run 'pipeshub login --no-wait' first.", EXIT.USAGE);
    }
    if (flags.url !== null && pending.origin !== origin) {
      throw new CliError(
        `The sign-in in progress is for ${pending.origin}. Run 'pipeshub login --url ${origin} --no-wait' to start one for ${origin}.`,
        EXIT.USAGE,
      );
    }
  } else {
    pending = await startLogin(origin ?? CLOUD_ORIGIN, flags.insecureHttp);
    const prompt = `Open ${pending.verificationUriComplete} and confirm the code ${pending.userCode}.`;
    if (flags.wait === false) {
      // For agents, whose output appears only when the command ends: hand the
      // link to the person, then finish with --wait.
      await emit({
        exit: EXIT.OK,
        payload: {
          requestId,
          origin: pending.origin,
          verificationUri: pending.verificationUri,
          verificationUriComplete: pending.verificationUriComplete,
          userCode: pending.userCode,
          expiresAt: new Date(pending.expiresAt).toISOString(),
          message: `Ask the user to ${prompt[0]!.toLowerCase()}${prompt.slice(1)}`,
          next: "pipeshub login --wait",
        },
        text: `${prompt}\nThen run: pipeshub login --wait`,
      }, flags.json);
      return EXIT.OK;
    }
    await writeFlushed(process.stderr, `${prompt}\nWaiting for approval...\n`);
  }
  const stored: StoredLogin = await waitForLogin(pending, flags.insecureHttp);
  const claims = describeToken(stored.accessToken);
  await emit({
    exit: EXIT.OK,
    payload: {
      requestId,
      loggedIn: true,
      origin: stored.origin,
      user: claims.fullName,
      userId: claims.userId,
      org: claims.orgId,
      scopes: claims.scopes,
      expiresAt: new Date(stored.expiresAt).toISOString(),
      credentials: credentialsPath(),
      // Some instances grant no refresh token; say so now, not in an hour.
      ...(stored.refreshToken
        ? {}
        : { note: `${stored.origin} issued no refresh token, so this sign-in ends at expiresAt. Run 'pipeshub login' again then.` }),
    },
    text: `Signed in to ${stored.origin}${claims.fullName ? ` as ${claims.fullName}` : ""}.`,
  }, flags.json);
  return EXIT.OK;
}

const code = await run(process.argv.slice(2)).catch(async (e: unknown) => {
  const err = e as CliError;
  const exit = typeof err.code === "number" ? err.code : EXIT.ERROR;
  await writeFlushed(process.stderr, `pipeshub: ${err.message}\n`);
  return exit;
});
process.exit(code);
