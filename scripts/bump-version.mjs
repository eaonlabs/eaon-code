// Bump every workspace package to one lockstep version without npm.
// Usage: node scripts/bump-version.mjs patch|minor|major|<explicit version>
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = process.argv[2];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function nextVersion(current, kind) {
	const match = SEMVER.exec(current);
	if (!match) throw new Error(`current version ${current} is not plain semver`);
	const [major, minor, patch] = match.slice(1).map(Number);
	if (kind === "major") return `${major + 1}.0.0`;
	if (kind === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

// Expand the root "workspaces" patterns. Supports "dir/*" and literal directories.
function workspaceDirectories() {
	const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	const dirs = [];
	for (const pattern of rootPackage.workspaces ?? []) {
		if (pattern.endsWith("/*")) {
			const base = join(root, pattern.slice(0, -2));
			if (!existsSync(base)) continue;
			for (const entry of readdirSync(base)) {
				const dir = join(base, entry);
				if (statSync(dir).isDirectory() && existsSync(join(dir, "package.json"))) dirs.push(dir);
			}
		} else if (existsSync(join(root, pattern, "package.json"))) {
			dirs.push(join(root, pattern));
		}
	}
	return dirs;
}

const dirs = workspaceDirectories();
const packages = dirs.map((dir) => ({ dir, json: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }));
if (packages.length === 0) throw new Error("no workspace packages found");

const current = packages.find((pkg) => pkg.json.name === "@eaonlabs/eaon-code")?.json.version ?? packages[0].json.version;
const next = target === "patch" || target === "minor" || target === "major" ? nextVersion(current, target) : target;
if (!SEMVER.test(next)) throw new Error(`invalid target version: ${next}`);
if (target !== "patch" && target !== "minor" && target !== "major" && compareVersions(next, current) <= 0) {
	throw new Error(`explicit version ${next} must be greater than current version ${current}`);
}

function compareVersions(a, b) {
	const pa = SEMVER.exec(a).slice(1).map(Number);
	const pb = SEMVER.exec(b).slice(1).map(Number);
	for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
	return 0;
}

for (const { dir, json } of packages) {
	json.version = next;
	writeFileSync(join(dir, "package.json"), `${JSON.stringify(json, null, "\t")}\n`);
}
console.log(`Bumped ${packages.length} workspace packages: ${current} -> ${next}`);
