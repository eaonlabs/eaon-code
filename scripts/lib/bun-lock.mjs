// Read bun.lock and return the npm lockfile "packages" map the coding-agent generators consume.
// bun.lock stores each package once with its name@version, integrity, dependencies, os/cpu/libc,
// and bin. Nested packages are keyed "parent/child". npm's map keys the same packages by
// "node_modules/..." path. hasInstallScript is not in bun.lock, so it is read from the installed
// package.json, and a package that is not installed is an error rather than a guess.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REGISTRY = "https://registry.npmjs.org";

// bun.lock is JSONC: trailing commas are allowed.
export function parseBunLock(text) {
	return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

function splitNameVersion(spec) {
	// "@scope/name@1.2.3" or "name@1.2.3"; workspace and git specs are handled by the caller.
	const at = spec.lastIndexOf("@");
	if (at <= 0) return { name: spec, version: undefined };
	return { name: spec.slice(0, at), version: spec.slice(at + 1) };
}

function tarballUrl(name, version) {
	const base = name.includes("/") ? name.split("/").pop() : name;
	return `${REGISTRY}/${name}/-/${base}-${version}.tgz`;
}

function installScriptNames(scripts = {}) {
	return ["preinstall", "install", "postinstall"].some((key) => typeof scripts[key] === "string");
}

// Optional platform packages are not installed on every machine, so their scripts come from the
// registry manifest for that exact version, the same source npm records hasInstallScript from.
function readPackageScripts(root, lockPath, name, version) {
	const local = join(root, lockPath, "package.json");
	if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8")).scripts;
	const result = spawnSync("curl", ["-fsSL", `${REGISTRY}/${name}/${version}`], { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`Cannot read install scripts for ${name}@${version} from the registry: ${result.stderr}`);
	}
	return JSON.parse(result.stdout).scripts;
}

/**
 * Return { lockfileVersion: 3, packages } in npm's shape for the root workspace, every workspace
 * package, and every installed external package.
 */
export function readNpmStyleLock(root) {
	const lock = parseBunLock(readFileSync(join(root, "bun.lock"), "utf8"));
	const packages = {};

	// Root and workspace entries come from the "workspaces" map. bun keys them by directory.
	for (const [dir, workspace] of Object.entries(lock.workspaces)) {
		const lockPath = dir;
		const entry = {
			name: workspace.name,
			version: workspace.version,
		};
		if (workspace.bin) entry.bin = workspace.bin;
		for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
			if (workspace[field]) entry[field] = workspace[field];
		}
		if (dir === "") {
			packages[""] = entry;
		} else {
			packages[lockPath] = entry;
		}
	}

	// Each workspace package also appears as a link under node_modules, as npm records it.
	for (const [key, [spec]] of Object.entries(lock.packages)) {
		if (!spec.includes("@workspace:")) continue;
		const dir = spec.slice(spec.indexOf("@workspace:") + "@workspace:".length);
		packages[`node_modules/${key}`] = { resolved: dir, link: true };
	}

	for (const [key, value] of Object.entries(lock.packages)) {
		const [spec, , meta = {}, integrity] = value;
		if (spec.includes("@workspace:")) continue;
		const { name, version } = splitNameVersion(spec);
		if (!version) throw new Error(`bun.lock entry ${key} has no version: ${spec}`);

		// Nested keys are "<parent>/<name>", where name may itself be scoped.
		const isNested = key !== name;
		const parent = isNested ? key.slice(0, key.length - name.length - 1) : undefined;
		const lockPath = isNested ? `node_modules/${parent}/node_modules/${name}` : `node_modules/${name}`;

		const entry = {
			version,
			resolved: tarballUrl(name, version),
		};
		if (integrity) entry.integrity = integrity;
		for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "bin"]) {
			if (meta[field] !== undefined) entry[field] = meta[field];
		}
		// bun writes a platform constraint as a string; npm writes a list.
		for (const field of ["os", "cpu", "libc"]) {
			if (meta[field] !== undefined) entry[field] = Array.isArray(meta[field]) ? meta[field] : [meta[field]];
		}
		if (Array.isArray(meta.optionalPeers) && meta.optionalPeers.length > 0) {
			entry.peerDependenciesMeta = Object.fromEntries(meta.optionalPeers.map((peer) => [peer, { optional: true }]));
		}
		if (meta.optional) entry.optional = true;
		packages[lockPath] = entry;
	}

	// hasInstallScript is recorded per package, as npm does.
	for (const [lockPath, entry] of Object.entries(packages)) {
		if (!lockPath.includes("node_modules/") || entry.link) continue;
		const name = lockPath.split("node_modules/").pop();
		const scripts = readPackageScripts(root, lockPath, name, entry.version);
		if (installScriptNames(scripts)) entry.hasInstallScript = true;
	}

	return { lockfileVersion: 3, packages };
}
