// A small JSONC editor: read a value by path, set or remove a member with the
// smallest textual edit. Zed and VS Code configs carry comments, and
// ~/.claude.json is large and rewritten by its own client, so parsing and
// re-printing the whole file (losing comments, reordering, reformatting) is not
// acceptable. Only objects are navigated (never arrays), which is all an MCP
// config needs.
//
// shortcut: no support for a UTF-8 BOM or for comments inside a key/colon gap
// beyond whitespace; upgrade if a real config trips it (it fails loudly).

export class JsoncError extends Error {}

interface Member {
  key: string;
  keyStart: number;
  valStart: number;
  valEnd: number;
}

interface ObjectInfo {
  open: number;
  close: number;
  members: Member[];
}

function skipWs(t: string, i: number): number {
  for (;;) {
    const c = t[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") i++;
    else if (c === "/" && t[i + 1] === "/") {
      while (i < t.length && t[i] !== "\n") i++;
    } else if (c === "/" && t[i + 1] === "*") {
      const end = t.indexOf("*/", i + 2);
      if (end < 0) throw new JsoncError("unterminated comment");
      i = end + 2;
    } else return i;
  }
}

function skipString(t: string, i: number): number {
  for (i++; i < t.length; i++) {
    if (t[i] === "\\") i++;
    else if (t[i] === '"') return i + 1;
  }
  throw new JsoncError("unterminated string");
}

function skipValue(t: string, i: number): number {
  const c = t[i];
  if (c === '"') return skipString(t, i);
  if (c === "{" || c === "[") {
    const closer = c === "{" ? "}" : "]";
    for (i = skipWs(t, i + 1); ; ) {
      if (t[i] === closer) return i + 1;
      if (c === "{") {
        if (t[i] !== '"') throw new JsoncError(`expected a key at offset ${i}`);
        i = skipWs(t, skipString(t, i));
        if (t[i] !== ":") throw new JsoncError(`expected ":" at offset ${i}`);
        i = skipWs(t, i + 1);
      }
      i = skipWs(t, skipValue(t, i));
      if (t[i] === ",") i = skipWs(t, i + 1);
      else if (t[i] !== closer) throw new JsoncError(`expected "," or "${closer}" at offset ${i}`);
    }
  }
  const m = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(t.slice(i, i + 40));
  if (!m) throw new JsoncError(`unexpected character at offset ${i}`);
  return i + m[0].length;
}

function readObject(t: string, open: number): ObjectInfo {
  if (t[open] !== "{") throw new JsoncError("expected an object");
  const members: Member[] = [];
  let i = skipWs(t, open + 1);
  while (t[i] !== "}") {
    if (t[i] !== '"') throw new JsoncError(`expected a key at offset ${i}`);
    const keyStart = i;
    const keyEnd = skipString(t, i);
    i = skipWs(t, keyEnd);
    if (t[i] !== ":") throw new JsoncError(`expected ":" at offset ${i}`);
    const valStart = skipWs(t, i + 1);
    const valEnd = skipValue(t, valStart);
    members.push({ key: JSON.parse(t.slice(keyStart, keyEnd)) as string, keyStart, valStart, valEnd });
    i = skipWs(t, valEnd);
    if (t[i] === ",") i = skipWs(t, i + 1);
    else if (t[i] !== "}") throw new JsoncError(`expected "," or "}" at offset ${i}`);
  }
  return { open, close: i, members };
}

function root(t: string): ObjectInfo {
  const open = skipWs(t, 0);
  const info = readObject(t, open);
  if (skipWs(t, info.close + 1) !== t.length) throw new JsoncError("content after the top-level object");
  return info;
}

/** Strict JSON text for a JSONC document (comments and trailing commas removed). Throws JsoncError when malformed. */
export function toStrict(t: string): string {
  root(t); // validates the structure
  let out = "";
  for (let i = 0; i < t.length; ) {
    const c = t[i]!;
    if (c === '"') {
      const e = skipString(t, i);
      out += t.slice(i, e);
      i = e;
    } else if (c === "/" && (t[i + 1] === "/" || t[i + 1] === "*")) {
      i = skipWs(t, i);
    } else if (c === ",") {
      const n = skipWs(t, i + 1);
      if (t[n] !== "}" && t[n] !== "]") out += ",";
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function jsoncParse(t: string): Record<string, unknown> {
  try {
    return JSON.parse(toStrict(t)) as Record<string, unknown>;
  } catch (e) {
    throw e instanceof JsoncError ? e : new JsoncError((e as Error).message);
  }
}

export function getAt(t: string, path: string[]): unknown {
  let v: unknown = jsoncParse(t);
  for (const k of path) {
    if (typeof v !== "object" || v === null || !(k in v)) return undefined;
    v = (v as Record<string, unknown>)[k];
  }
  return v;
}

function indentUnit(t: string): string {
  const m = /\n([ \t]+)\S/.exec(t);
  return m ? (m[1]!.startsWith("\t") ? "\t" : m[1]!) : "  ";
}

function lineIndent(t: string, pos: number): string {
  const start = t.lastIndexOf("\n", pos - 1) + 1;
  return /^[ \t]*/.exec(t.slice(start, pos))![0];
}

const eolOf = (t: string) => (t.includes("\r\n") ? "\r\n" : "\n");

function render(value: unknown, indent: string, unit: string, eol = "\n"): string {
  return JSON.stringify(value, null, unit).split("\n").join(eol + indent);
}

/** Insert `"key": value` as the last member of the object. */
function insertMember(t: string, obj: ObjectInfo, key: string, value: unknown, unit: string): string {
  const eol = eolOf(t);
  const parentIndent = lineIndent(t, obj.open);
  const last = obj.members[obj.members.length - 1];
  if (last && !t.slice(obj.open, obj.close).includes("\n")) {
    // A one-line object stays one line, in its own spacing: `{"a":1}` gets `,"k":v`, `{ "a": 1 }` gets `, "k": v`.
    const spaced = /\s/.test(t.slice(last.keyStart, last.valStart));
    const inline = `${JSON.stringify(key)}${spaced ? ": " : ":"}${JSON.stringify(value)}`;
    return t.slice(0, last.valEnd) + (spaced ? ", " : ",") + inline + t.slice(last.valEnd);
  }
  const inner = last ? lineIndent(t, last.keyStart) : parentIndent + unit;
  const member = `${JSON.stringify(key)}: ${render(value, inner, unit, eol)}`;
  if (!last) return t.slice(0, obj.open + 1) + `${eol}${inner}${member}${eol}${parentIndent}` + t.slice(obj.close);
  // Go past the last member's own comma and same-line comment, so they stay on its line.
  const blanks = (i: number) => { while (t[i] === " " || t[i] === "\t") i++; return i; };
  let pos = last.valEnd;
  const c = blanks(pos);
  const hadComma = t[c] === ",";
  if (hadComma) pos = c + 1;
  const k = blanks(pos);
  if (t[k] === "/" && t[k + 1] === "/") pos = t.indexOf("\n", k) < 0 ? t.length : t.indexOf("\n", k);
  else if (t[k] === "/" && t[k + 1] === "*" && !t.slice(k, t.indexOf("*/", k)).includes("\n")) pos = t.indexOf("*/", k) + 2;
  if (t[pos - 1] === "\r") pos--; // a `//` comment ends before the \r of a CRLF line end
  const head = hadComma ? t.slice(0, pos) : t.slice(0, last.valEnd) + "," + t.slice(last.valEnd, pos);
  return head + `${eol}${inner}${member}${hadComma ? "," : ""}` + t.slice(pos);
}

/** Set the object member at `path` (creating the objects on the way), changing nothing else. */
export function setAt(text: string, path: string[], value: unknown): string {
  const t = text.trim() === "" ? "{}\n" : text;
  const unit = indentUnit(t);
  let obj = root(t);
  for (let d = 0; d < path.length; d++) {
    const k = path[d]!;
    const m = obj.members.find((x) => x.key === k);
    if (d === path.length - 1) {
      if (m) return t.slice(0, m.valStart) + render(value, lineIndent(t, m.keyStart), unit) + t.slice(m.valEnd);
      return insertMember(t, obj, k, value, unit);
    }
    if (!m) {
      // Build the rest of the path as nested objects and insert it here.
      let nested: unknown = value;
      for (let j = path.length - 1; j > d; j--) nested = { [path[j]!]: nested };
      return insertMember(t, obj, k, nested, unit);
    }
    if (t[m.valStart] !== "{") throw new JsoncError(`"${path.slice(0, d + 1).join(".")}" is not an object`);
    obj = readObject(t, m.valStart);
  }
  return t;
}

/**
 * Remove the member at `path`, changing nothing else. A parent object it leaves empty goes too (it was made for it), unless
 * `keepParent`: the person had that object already, so it stays, as `{}`. No-op when absent.
 */
export function removeAt(text: string, path: string[], opts: { keepParent?: boolean } = {}): string {
  let t = text;
  for (let depth = path.length; depth > 0; depth--) {
    const chain: ObjectInfo[] = [];
    let obj = root(t);
    chain.push(obj);
    let found = true;
    for (let d = 0; d < depth - 1; d++) {
      const m = obj.members.find((x) => x.key === path[d]);
      if (!m || t[m.valStart] !== "{") { found = false; break; }
      obj = readObject(t, m.valStart);
      chain.push(obj);
    }
    if (!found) return t;
    const idx = obj.members.findIndex((x) => x.key === path[depth - 1]);
    if (idx < 0) return t;
    const m = obj.members[idx]!;
    const prev = idx > 0 ? obj.members[idx - 1]! : null;
    const next = obj.members[idx + 1] ?? null;
    const isLast = next === null;
    const afterVal = skipWs(t, m.valEnd);
    const ownTrailingComma = isLast && t[afterVal] === ",";
    const sharesLineWithPrev = prev !== null && !t.slice(prev.valEnd, m.keyStart).includes("\n");
    let start: number;
    let end: number;
    let dropPrevComma = isLast && idx > 0 && !ownTrailingComma; // trailing-comma style keeps the comma it had
    if (isLast && sharesLineWithPrev) {
      // One-line object: take the separator in front of the member with it.
      start = prev!.valEnd;
      end = m.valEnd;
      dropPrevComma = false;
    } else if (!isLast && !t.slice(m.valEnd, next!.keyStart).includes("\n") && !t.slice(0, m.keyStart).endsWith("\n")) {
      start = m.keyStart;
      end = next!.keyStart;
    } else {
      start = t.lastIndexOf("\n", m.keyStart - 1) + 1;
      if (t.slice(start, m.keyStart).trim() !== "") start = m.keyStart; // shares its line with something
      end = m.valEnd;
      const after = skipWs(t, end);
      if (t[after] === ",") end = after + 1;
      // Take the rest of the line (and its newline) when only whitespace follows.
      const eol = /^[ \t]*\r?\n/.exec(t.slice(end));
      if (eol && start < m.keyStart) end += eol[0].length;
    }
    t = t.slice(0, start) + t.slice(end);
    if (dropPrevComma) {
      // The previous member lost its follower: drop its comma so strict JSON stays valid.
      const c = skipWs(t, prev!.valEnd);
      if (t[c] === ",") t = t.slice(0, c) + t.slice(c + 1);
    }
    if (obj.members.length > 1) return t;
    if (opts.keepParent && depth === path.length) {
      // The object is empty now; leave it as `{}`, which is how a person writes an empty one.
      const o2 = readObject(t, obj.open);
      if (/^\s*$/.test(t.slice(o2.open + 1, o2.close))) t = t.slice(0, o2.open + 1) + t.slice(o2.close);
      return t;
    }
  }
  return t;
}
