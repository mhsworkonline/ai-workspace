#!/usr/bin/env node
/**
 * deploy.js — Push local commits to GitHub
 * Usage: node deploy.js
 * Options:
 *   --force   Force-push (use carefully — rewrites remote history)
 *   --branch  Branch name to push to (default: main)
 */

const { execSync } = require("child_process");

const args = process.argv.slice(2);
const force = args.includes("--force");
const branchArg = args.find((a) => a.startsWith("--branch="));
const branch = branchArg ? branchArg.split("=")[1] : "main";

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
