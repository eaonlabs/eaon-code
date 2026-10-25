#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { parseBunLock } from "./lib/bun-lock.mjs";

const LOCKFILE = "bun.lock";
const allowValue = process.env.PI_ALLOW_LOCKFILE_CHANGE;
const allowed = allowValue === "1" || allowValue === "true" || allowValue === "yes";

function git(args) {
	return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function readLockfileFromGit(ref) {
	try {
		return parseBunLock(git(["show", ref]));
	} catch {
		return undefined;
	}
}

function isWorkspaceEntry(value) {
	return typeof value?.[0] === "string" && value[0].includes("@workspace:");
}

// bun.lock keys each package once. Compare the entry arrays, which hold name@version, integrity,
// and metadata.
function getLockfilePackageChanges() {
	const before = readLockfileFromGit("HEAD:" + LOCKFILE)?.packages;
	const after = readLockfileFromGit(":" + LOCKFILE)?.packages;
	if (!before || !after) return undefined;

	const changes = [];
	for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
		const oldValue = before[key];
		const newValue = after[key];
		if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
			changes.push({ key, oldValue, newValue });
		}
	}
	return changes;
}

function nameAndVersion(value) {
	if (!value?.[0]) return { name: undefined, version: undefined };
	const spec = value[0];
	const at = spec.lastIndexOf("@");
	if (at <= 0) return { name: spec, version: undefined };
	return { name: spec.slice(0, at), version: spec.slice(at + 1) };
}

function hasOnlyWorkspaceChanges(changes) {
	return changes.length > 0 && changes.every(({ oldValue, newValue }) => isWorkspaceEntry(oldValue) || isWorkspaceEntry(newValue));
}

function summarizeLockfileChange(changes) {
	const summary = [];
	for (const { key, oldValue, newValue } of changes) {
		if (!oldValue && newValue) {
			const next = nameAndVersion(newValue);
			summary.push(`added ${next.name}@${next.version ?? "<none>"}`);
		} else if (oldValue && !newValue) {
			const prev = nameAndVersion(oldValue);
			summary.push(`removed ${prev.name}@${prev.version ?? "<none>"}`);
		} else {
			const prev = nameAndVersion(oldValue);
			const next = nameAndVersion(newValue);
			if (prev.version !== next.version) {
				summary.push(`changed ${next.name ?? key} ${prev.version ?? "<none>"} -> ${next.version ?? "<none>"}`);
			} else {
				summary.push(`changed ${key}`);
			}
		}
	}
	return summary;
}

const stagedFiles = git(["diff", "--cached", "--name-only"])
	.split("\n")
	.map((line) => line.trim())
	.filter(Boolean);

if (!stagedFiles.includes(LOCKFILE)) {
	process.exit(0);
}

if (allowed) {
	console.error(`${LOCKFILE} is staged; PI_ALLOW_LOCKFILE_CHANGE is set, allowing commit.`);
	process.exit(0);
}

const changes = getLockfilePackageChanges();
if (changes && hasOnlyWorkspaceChanges(changes)) {
	console.error(`${LOCKFILE} only updates workspace package metadata; allowing commit.`);
	process.exit(0);
}

console.error(`${LOCKFILE} is staged.`);
console.error("");
console.error("Review lockfile changes before committing:");
console.error("  - confirm every new/updated package is intentional");
console.error("  - confirm package age gates were active for resolution");
console.error("  - review any new lifecycle scripts in the dependency tree");

const summary = changes ? summarizeLockfileChange(changes) : [];
if (summary.length > 0) {
	console.error("");
	console.error("Detected package version changes:");
	for (const change of summary.slice(0, 40)) {
		console.error(`  - ${change}`);
	}
	if (summary.length > 40) {
		console.error(`  - ... ${summary.length - 40} more`);
	}
}

console.error("");
console.error("Set PI_ALLOW_LOCKFILE_CHANGE=1 only after the review above.");
process.exit(1);
