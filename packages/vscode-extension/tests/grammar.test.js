"use strict";

// Tokenisation tests for the kymo-diagram TextMate grammar
// (syntaxes/kymo.tmLanguage.json). They load the grammar through the same
// engine VS Code uses (vscode-textmate + vscode-oniguruma) and assert that
// representative kymo constructs receive the expected scopes.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vsctm = require("vscode-textmate");
const oniguruma = require("vscode-oniguruma");

const GRAMMAR_PATH = path.join(__dirname, "..", "syntaxes", "kymo.tmLanguage.json");
const SCOPE_NAME = "source.kymo";

let registryPromise;

function getRegistry() {
  if (registryPromise) return registryPromise;
  const wasmBin = fs.readFileSync(
    path.join(require.resolve("vscode-oniguruma"), "..", "..", "release", "onig.wasm"),
  ).buffer;
  const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => ({
    createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
    createOnigString: (s) => new oniguruma.OnigString(s),
  }));
  const registry = new vsctm.Registry({
    onigLib: vscodeOnigurumaLib,
    loadGrammar: async (scopeName) => {
      if (scopeName !== SCOPE_NAME) return null;
      const data = fs.readFileSync(GRAMMAR_PATH, "utf8");
      return vsctm.parseRawGrammar(data, GRAMMAR_PATH);
    },
  });
  registryPromise = registry.loadGrammar(SCOPE_NAME);
  return registryPromise;
}

// Tokenise one line and return [{ text, scopes }, …].
async function tokenize(line) {
  const grammar = await getRegistry();
  const { tokens } = grammar.tokenizeLine(line, vsctm.INITIAL);
  return tokens.map((t) => ({ text: line.slice(t.startIndex, t.endIndex), scopes: t.scopes }));
}

// Assert that the token covering `text` carries a scope starting with `scopePrefix`.
function assertScope(toks, text, scopePrefix) {
  const tok = toks.find((t) => t.text === text);
  assert.ok(tok, `expected a token with text ${JSON.stringify(text)} in ${JSON.stringify(toks.map((t) => t.text))}`);
  assert.ok(
    tok.scopes.some((s) => s.startsWith(scopePrefix)),
    `token ${JSON.stringify(text)} had scopes ${JSON.stringify(tok.scopes)}, expected one starting with ${JSON.stringify(scopePrefix)}`,
  );
}

test("comment line is scoped as a comment", async () => {
  const toks = await tokenize("# this is a comment");
  assert.ok(toks[toks.length - 1].scopes.some((s) => s.startsWith("comment.line")));
});

test("hex colour after stroke is a colour, not a comment", async () => {
  const toks = await tokenize("  outer-region stroke #76b900 {");
  assertScope(toks, "#76b900", "constant.other.color");
  // and there is no comment scope anywhere on the line
  assert.ok(!toks.some((t) => t.scopes.some((s) => s.startsWith("comment"))));
});

test("3-digit hex colour is recognised", async () => {
  const toks = await tokenize("x stroke #f0a");
  assertScope(toks, "#f0a", "constant.other.color");
});

test("double-quoted string is scoped", async () => {
  const toks = await tokenize('title: "Hello World"');
  assertScope(toks, "title", "keyword.control.directive");
  const str = toks.find((t) => t.text.includes("Hello World"));
  assert.ok(str && str.scopes.some((s) => s.startsWith("string.quoted")));
});

test("leaf shape/icon/accent triple splits into shape, icon, accent", async () => {
  const toks = await tokenize('orch hex/hex-agent/green "Orchestrator" ""');
  assertScope(toks, "hex", "storage.type.shape");
  assertScope(toks, "hex-agent", "entity.name.icon");
  assertScope(toks, "green", "constant.language.accent");
});

test("edge arrows are operators", async () => {
  const dashed = await tokenize("a --> b");
  assertScope(dashed, "-->", "keyword.operator.edge");
  const bold = await tokenize("a ==> b");
  assertScope(bold, "==>", "keyword.operator.edge");
});

test("integer literals are numeric", async () => {
  const toks = await tokenize("blk outer \"X\" padding (40, 32) padding-bottom 40 {");
  assertScope(toks, "40", "constant.numeric");
  assertScope(toks, "padding-bottom", "support.type.property-name");
});

test("placement @ and side constant", async () => {
  const toks = await tokenize("fs box/folder/orange \"File System\" \"\" @ researcher right 100");
  assertScope(toks, "@", "keyword.operator.placement");
  assertScope(toks, "right", "constant.language");
});

test("bpmn block: node kinds and flow arrows", async () => {
  const grammar = await getRegistry();
  const lines = ["bpmn {", "  start S \"Order received\"", "  end! C \"Cancelled\"", "  S -> V ~> M ..> N", "}"];
  let state = vsctm.INITIAL;
  const all = [];
  for (const line of lines) {
    const r = grammar.tokenizeLine(line, state);
    state = r.ruleStack;
    all.push(r.tokens.map((t) => ({ text: line.slice(t.startIndex, t.endIndex), scopes: t.scopes })));
  }
  assertScope(all[1], "start", "keyword.other.bpmn-node");
  assertScope(all[2], "end!", "keyword.other.bpmn-node");
  assertScope(all[3], "->", "keyword.operator.bpmn-flow");
  assertScope(all[3], "~>", "keyword.operator.bpmn-flow");
  assertScope(all[3], "..>", "keyword.operator.bpmn-flow");
});
