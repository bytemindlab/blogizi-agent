#!/usr/bin/env node
// One-command release for the Blogizi CLI, skill and Claude/Gemini plugins.
//
//   npm run release -- patch          0.5.4 → 0.5.5
//   npm run release -- minor          0.5.4 → 0.6.0
//   npm run release -- 1.0.0          exact version
//
// Flags:
//   --dry-run      show what would change, touch nothing
//   --no-push      commit + tag locally, don't push
//   --no-publish   push, but don't run npm publish
//
// Steps: check the repo → bump every version file → sync SKILL.md copies →
// build and check `blogizi --version` → commit "Release X" + tag vX →
// git push --follow-tags → npm publish (asks for your 2FA code).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const bump = args.find((a) => !a.startsWith("--"));
const DRY = flags.has("--dry-run");
const PUSH = !flags.has("--no-push");
const PUBLISH = PUSH && !flags.has("--no-publish");

const VERSION_FILES = [
  "package.json",
  "package-lock.json",
  "gemini-extension.json",
  "plugins/blogizi/.claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
];
const SKILL_COPIES = ["skills/blogizi/SKILL.md", "plugins/blogizi/skills/blogizi/SKILL.md"];

const c = { dim: (s) => `\x1b[2m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` };
const step = (s) => console.log(`${c.green("›")} ${s}`);
function fail(msg) {
  console.error(`${c.red("✖")} ${msg}`);
  process.exit(1);
}
function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { encoding: "utf8", stdio: opts.inherit ? "inherit" : "pipe" });
}
const git = (...a) => run("git", a).trim();

// ── 1. Work out the new version ────────────────────────────────────────────
if (!bump) fail("Usage: npm run release -- <patch|minor|major|x.y.z> [--dry-run] [--no-push] [--no-publish]");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const current = pkg.version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!m) fail(`package.json version "${current}" isn't x.y.z`);
let [maj, min, pat] = m.slice(1).map(Number);
let next;
if (bump === "patch") next = `${maj}.${min}.${pat + 1}`;
else if (bump === "minor") next = `${maj}.${min + 1}.0`;
else if (bump === "major") next = `${maj + 1}.0.0`;
else if (/^\d+\.\d+\.\d+$/.test(bump)) next = bump;
else fail(`Don't understand "${bump}". Use patch, minor, major or x.y.z.`);
const cmp = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
if (cmp(next, current) <= 0) fail(`${next} isn't higher than the current ${current}`);
const tag = `v${next}`;

console.log(c.bold(`\nBlogizi release ${current} → ${next}${DRY ? "  (dry run)" : ""}\n`));

// ── 2. Check the repo ──────────────────────────────────────────────────────
const branch = git("branch", "--show-current");
if (branch !== "main") fail(`You're on "${branch}". Release from main.`);
const dirty = git("status", "--porcelain").split("\n").filter(Boolean)
  // SKILL.md copies are regenerated below, so they may differ.
  .filter((l) => !SKILL_COPIES.some((f) => l.endsWith(f)));
if (dirty.length) fail(`Commit or stash these first:\n${dirty.join("\n")}`);
if (git("tag", "--list", tag)) fail(`Tag ${tag} already exists.`);
if (PUSH) {
  try {
    run("git", ["fetch", "--quiet", "origin", "main"]);
    const [behind] = git("rev-list", "--left-right", "--count", "origin/main...HEAD").split(/\s+/).map(Number);
    if (behind > 0) fail(`main is ${behind} commit(s) behind origin. Pull first.`);
  } catch (e) {
    if (e?.status === 1 && String(e.message).includes("behind")) throw e;
    console.log(c.dim("  (couldn't reach origin to compare; continuing)"));
  }
}
if (PUBLISH && !DRY) {
  try {
    const who = run("npm", ["whoami"]).trim();
    step(`npm user: ${who}`);
  } catch {
    fail("Not logged in to npm. Run `npm login`, or pass --no-publish.");
  }
}

// ── 3. Bump versions ───────────────────────────────────────────────────────
const originals = new Map();
function editJson(file, mutate) {
  const before = readFileSync(file, "utf8");
  const data = JSON.parse(before);
  mutate(data);
  const after = JSON.stringify(data, null, 2) + "\n";
  originals.set(file, before);
  if (!DRY) writeFileSync(file, after);
}
function restore() {
  for (const [file, text] of originals) writeFileSync(file, text);
}

try {
  step("Bumping versions");
  editJson("package.json", (d) => { d.version = next; });
  editJson("package-lock.json", (d) => {
    d.version = next;
    if (d.packages?.[""]) d.packages[""].version = next;
  });
  editJson("gemini-extension.json", (d) => { d.version = next; });
  editJson("plugins/blogizi/.claude-plugin/plugin.json", (d) => { d.version = next; });
  editJson(".claude-plugin/marketplace.json", (d) => {
    if (d.metadata) d.metadata.version = next;
    for (const p of d.plugins || []) if (p.name === "blogizi" || (d.plugins || []).length === 1) p.version = next;
  });
  for (const f of VERSION_FILES) console.log(c.dim(`  ${f}`));

  step("Syncing SKILL.md into the skill and plugin folders");
  if (!DRY) for (const f of SKILL_COPIES) copyFileSync("SKILL.md", f);

  if (DRY) {
    console.log(`\nDry run done. A real run would commit "Release ${next}", tag ${tag}` +
      `${PUSH ? ", push to origin" : ""}${PUBLISH ? " and npm publish" : ""}.`);
    process.exit(0);
  }

  // ── 4. Build and check ───────────────────────────────────────────────────
  step("Building");
  run("npm", ["run", "-s", "build"], { inherit: true });
  const built = run("node", ["dist/index.js", "--version"]).trim();
  if (built !== next) throw new Error(`dist reports ${built}, expected ${next}`);
  const packed = run("npm", ["pack", "--dry-run", "--json"]);
  const files = JSON.parse(packed)[0].files.map((f) => f.path);
  for (const need of ["dist/index.js", "SKILL.md", "README.md", "LICENSE"]) {
    if (!files.includes(need)) throw new Error(`npm package would be missing ${need}`);
  }
  console.log(c.dim(`  ${files.length} files in the package, blogizi --version = ${built}`));
} catch (e) {
  restore();
  fail(`${e.message}\nVersion files restored; nothing was committed.`);
}

// ── 5. Commit and tag ──────────────────────────────────────────────────────
step(`Committing "Release ${next}" and tagging ${tag}`);
git("add", ...VERSION_FILES, ...SKILL_COPIES);
git("commit", "-q", "-m", `Release ${next}`);
git("tag", "-a", tag, "-m", tag);

// ── 6. Push and publish ────────────────────────────────────────────────────
if (!PUSH) {
  console.log(`\nDone locally. When ready:\n  git push origin main --follow-tags\n  npm publish`);
  process.exit(0);
}
step("Pushing main and the tag");
run("git", ["push", "origin", "main", "--follow-tags"], { inherit: true });

if (!PUBLISH) {
  console.log(`\nPushed. Publish to npm when ready with: npm publish`);
  process.exit(0);
}
step("Publishing to npm (enter your 2FA code if asked)");
try {
  run("npm", ["publish"], { inherit: true });
} catch {
  fail(`npm publish failed. The commit and tag are pushed; fix the problem and run \`npm publish\` again.`);
}

console.log(`\n${c.green("✓")} Released ${next}
  npm:     npm i -g blogizi@latest   (check: npm view blogizi version)
  Claude:  /plugin marketplace update, then update the blogizi plugin
  GitHub:  gh release create ${tag} --generate-notes   (optional)\n`);
