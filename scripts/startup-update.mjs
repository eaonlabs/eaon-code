import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INSTALL_MARKER_KIND = "eaon-code-source-install";
const INSTALL_MARKER_PATH = join(".git", "eaon-code-install.json");

function readInstallConfig(root) {
	if (!existsSync(join(root, "install.sh"))) return undefined;
	try {
		const marker = JSON.parse(readFileSync(join(root, INSTALL_MARKER_PATH), "utf8"));
		if (
			marker.kind === INSTALL_MARKER_KIND &&
			marker.schemaVersion === 1 &&
			typeof marker.repo === "string" &&
			/^[\w.-]+\/[\w.-]+$/.test(marker.repo) &&
			typeof marker.ref === "string" &&
			marker.ref.length > 0 &&
			typeof marker.binDir === "string" &&
			marker.binDir.length > 0
		) {
			return {
				repo: marker.repo,
				ref: marker.ref,
				binDir: marker.binDir,
				installedCommit: typeof marker.installedCommit === "string" ? marker.installedCommit : undefined,
			};
		}
	} catch {
		// Non-installer checkouts use the CLI directly.
	}
	return undefined;
}

function runGit(root, args, timeout = 15_000) {
	const result = spawnSync("git", ["-C", root, ...args], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
		timeout,
	});
	return result.status === 0 ? result.stdout.trim() : undefined;
}

function checkForSourceUpdate(root, config) {
	const status = runGit(root, ["status", "--porcelain", "--untracked-files=normal"]);
	if (status === undefined || status.length > 0) return;

	const currentCommit = runGit(root, ["rev-parse", "HEAD"]);
	if (!currentCommit) return;

	const fetch = spawnSync("git", ["-C", root, "fetch", "--depth", "1", "origin", config.ref, "-q"], {
		stdio: "ignore",
		timeout: 15_000,
	});
	if (fetch.status !== 0) return;

	const latestCommit = runGit(root, ["rev-parse", "FETCH_HEAD"]);
	if (!latestCommit || latestCommit === (config.installedCommit ?? currentCommit)) return;

	spawnSync("bash", [join(root, "install.sh")], {
		stdio: "ignore",
		env: {
			...process.env,
			EAON_CODE_PREFIX: root,
			EAON_CODE_REPO: config.repo,
			EAON_CODE_REF: config.ref,
			EAON_CODE_BIN_DIR: config.binDir,
		},
	});
}

function shouldCheck(args) {
	return (
		!args.some((arg) => arg === "--help" || arg === "-h" || arg === "--version" || arg === "-v") &&
		!args.includes("--offline") &&
		!process.env.EAON_CODE_OFFLINE &&
		!process.env.PI_OFFLINE
	);
}

function main() {
	const [rootArgument, cliArgument, ...args] = process.argv.slice(2);
	if (!rootArgument || !cliArgument) {
		console.error("eaon-code: installer startup wrapper is missing its CLI path");
		process.exitCode = 1;
		return;
	}

	const root = resolve(rootArgument);
	if (shouldCheck(args)) {
		const config = readInstallConfig(root);
		if (config) {
			if (process.stderr.isTTY) process.stderr.write("Checking for updates...\n");
			checkForSourceUpdate(root, config);
		}
	}

	const cli = spawnSync(process.execPath, [resolve(cliArgument), ...args], { stdio: "inherit" });
	if (cli.error) {
		console.error(`eaon-code: could not start CLI: ${cli.error.message}`);
		process.exitCode = 1;
	} else {
		process.exitCode = cli.status ?? 1;
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
