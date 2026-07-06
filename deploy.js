#!/usr/bin/env node
/**
 * deploy.js — Stage, commit, and push everything to GitHub
 * Usage: node deploy.js ["commit message"] [options]
 * Options:
 *   --force   Force-push (use carefully — rewrites remote history)
 *   --branch  Branch name to push to (default: main)
 *   --allow-secrets  Skip the check for likely secret files (dangerous)
 *
 * Run with no arguments to fully automate: stages everything, generates a
 * commit message from the changed files if none is given, and pushes.
 */

const { execSync } = require("child_process");

const args = process.argv.slice(2);
const force = args.includes("--force");
const allowSecrets = args.includes("--allow-secrets");
const branchArg = args.find((a) => a.startsWith("--branch="));
const branch = branchArg ? branchArg.split("=")[1] : "main";
const message = args.find((a) => !a.startsWith("--"));

// Filenames that should never be committed even though .gitignore may miss them.
const SECRET_PATTERN = /(^|\/)\.env(\.|$)|credentials.*\.json$|\.pem$|id_rsa$|\.key$/i;

/** Builds a conventional-commit-style message from staged file changes. */
function buildAutoMessage(nameStatus) {
  const groups = { added: [], modified: [], deleted: [], renamed: [] };
  for (const line of nameStatus.split("\n").filter(Boolean)) {
    const [status, ...pathParts] = line.split("\t");
    const file = pathParts[pathParts.length - 1];
    const base = status[0];
    if (base === "A") groups.added.push(file);
    else if (base === "D") groups.deleted.push(file);
    else if (base === "R") groups.renamed.push(file);
    else groups.modified.push(file);
  }

  const allFiles = [...groups.added, ...groups.modified, ...groups.deleted, ...groups.renamed];
  const names = (arr) => {
    const basenames = arr.map((f) => f.split("/").pop());
    return basenames.length > 4
      ? `${basenames.slice(0, 4).join(", ")}, +${basenames.length - 4} more`
      : basenames.join(", ");
  };

  const prefix = groups.added.length > 0 && groups.modified.length === 0 && groups.deleted.length === 0
    ? "feat"
    : groups.deleted.length > 0 && groups.added.length === 0 && groups.modified.length === 0
      ? "chore"
      : "chore";

  const parts = [];
  if (groups.added.length) parts.push(`add ${names(groups.added)}`);
  if (groups.modified.length) parts.push(`update ${names(groups.modified)}`);
  if (groups.deleted.length) parts.push(`remove ${names(groups.deleted)}`);
  if (groups.renamed.length) parts.push(`rename ${names(groups.renamed)}`);

  const summary = parts.join("; ") || `update ${allFiles.length} file(s)`;
  return `${prefix}: ${summary}`;
}

function run(cmd, label) {
  console.log(`\n→ ${label}`);
  try {
    const out = execSync(cmd, { stdio: "pipe", encoding: "utf8" });
    if (out.trim()) console.log(out.trim());
    return out.trim();
  } catch (err) {
    const msg = (err.stderr || err.stdout || err.message || "").trim();
    console.error(`✗ Failed: ${msg}`);
    process.exit(1);
  }
}

console.log("=== AI Workspace — GitHub Deploy ===");

// Verify we're in the right repo
const remotes = run("git remote -v", "Checking remote");
if (!remotes.includes("github.com/mhsworkonline/ai-workspace")) {
  console.error("✗ Remote is not mhsworkonline/ai-workspace. Aborting.");
  process.exit(1);
}

// Stage everything (respects .gitignore) and see what's pending
run("git add -A", "Staging changes");
const staged = run("git diff --cached --name-only", "Checking staged files");

if (staged) {
  const stagedFiles = staged.split("\n").filter(Boolean);
  const suspicious = stagedFiles.filter((f) => SECRET_PATTERN.test(f));
  if (suspicious.length > 0 && !allowSecrets) {
    console.error(
      `✗ Refusing to commit files that look like secrets:\n  ${suspicious.join("\n  ")}\n` +
        `  Unstage them (git restore --staged <file>) or re-run with --allow-secrets if this is a false positive.`
    );
    process.exit(1);
  }

  let commitMessage = message;
  if (!commitMessage) {
    const nameStatus = run("git diff --cached --name-status", "Summarizing changes");
    commitMessage = buildAutoMessage(nameStatus);
    console.log(`  (no message given — auto-generated: "${commitMessage}")`);
  }

  run(`git commit -m ${JSON.stringify(commitMessage)}`, `Committing: ${commitMessage}`);
} else {
  console.log("Nothing to commit — working tree clean.");
}

// Show what will be pushed
const log = run(`git log origin/${branch}..HEAD --oneline 2>/dev/null || git log --oneline -10`, "Commits to push");
if (!log) {
  console.log("Nothing new to push — already up to date.");
  process.exit(0);
}

// Push
const pushCmd = force
  ? `git push --force origin HEAD:${branch}`
  : `git push -u origin HEAD:${branch}`;

run(pushCmd, `Pushing to origin/${branch}${force ? " (force)" : ""}`);

console.log(`\n✓ Done. Code is live at https://github.com/mhsworkonline/ai-workspace/tree/${branch}`);
