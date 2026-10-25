import { existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import { homedir } from "os";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { normalizePath } from "./utils/paths.ts";
import { stripBom } from "./utils/text.ts";

// =============================================================================
// Package Detection
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect if we're running as a Bun compiled binary.
 * Bun binaries have import.meta.url containing "$bunfs", "~BUN", or "%7EBUN" (Bun's virtual filesystem path)
 */
export const isBunBinary =
	import.meta.url.includes("$bunfs") || import.meta.url.includes("~BUN") || import.meta.url.includes("%7EBUN");

/** Detect if Bun is the runtime (compiled binary or bun run) */
export const isBunRuntime = !!process.versions.bun;

/** Detect the esbuild-bundled Node.js distribution. */
declare const PI_BUNDLED_NODE: boolean;
export const isBundledNode = typeof PI_BUNDLED_NODE !== "undefined" && PI_BUNDLED_NODE;

// =============================================================================
// Install Method Detection
// =============================================================================

export type InstallMethod = "bun-binary" | "unknown";

/** Where to get the installer that updates an installation that is not a source checkout. */
export const INSTALLER_COMMAND =
	"curl -fsSL https://raw.githubusercontent.com/eaonlabs/eaon-code/main/install.sh | bash";

export function detectInstallMethod(): InstallMethod {
	return isBunBinary ? "bun-binary" : "unknown";
}

/**
 * How to update an installation that `update --self` cannot update itself: the bun binary is
 * replaced from its GitHub release, and anything else is updated by re-running the installer.
 */
export function getSelfUpdateUnavailableInstruction(): string {
	if (detectInstallMethod() === "bun-binary") {
		return "Download from: https://github.com/eaonlabs/eaon-code/releases/latest";
	}
	return `Re-run the installer to update this installation: ${INSTALLER_COMMAND}`;
}

// =============================================================================
// Package Asset Paths (shipped with executable)
// =============================================================================

/**
 * Get the base directory for resolving package assets (themes, package.json, README.md, CHANGELOG.md).
 * - For Bun binary: returns the directory containing the executable
 * - For Node.js: returns the package root containing package.json
 * - Ignores Bun binary metadata copied into dist/ when the package root is available
 */
export function findNodePackageDir(startDir: string): string {
	let dir = startDir;
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) {
			const parent = dirname(dir);
			// build:binary places Bun's metadata inside dist/. Node still needs the
			// package root so its dist-relative asset paths do not become dist/dist/.
			if (basename(dir) === "dist" && existsSync(join(parent, "package.json"))) {
				return parent;
			}
			return dir;
		}
		dir = dirname(dir);
	}
	return startDir;
}

export function getPackageDir(): string {
	const envDir = process.env.EAON_CODE_PACKAGE_DIR ?? process.env.PI_PACKAGE_DIR;
	if (envDir) {
		return normalizePath(envDir);
	}

	if (isBunBinary) {
		// Bun binary: process.execPath points to the compiled executable
		return dirname(process.execPath);
	}
	return findNodePackageDir(__dirname);
}

/**
 * Get path to built-in themes directory (shipped with package)
 * - For Bun binary: theme/ next to executable
 * - For Node.js (dist/): dist/modes/interactive/theme/
 * - For source (src/): src/modes/interactive/theme/
 */
export function getThemesDir(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "theme");
	}
	// Theme is in modes/interactive/theme/ relative to src/ or dist/
	const packageDir = getPackageDir();
	const srcOrDist = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, srcOrDist, "modes", "interactive", "theme");
}

/**
 * Get path to HTML export template directory (shipped with package)
 * - For Bun binary: export-html/ next to executable
 * - For Node.js (dist/): dist/core/export-html/
 * - For source (src/): src/core/export-html/
 */
export function getExportTemplateDir(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "export-html");
	}
	const packageDir = getPackageDir();
	const srcOrDist = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, srcOrDist, "core", "export-html");
}

/** Get path to package.json */
export function getPackageJsonPath(): string {
	return join(getPackageDir(), "package.json");
}

/** Get path to README.md */
export function getReadmePath(): string {
	return resolve(join(getPackageDir(), "README.md"));
}

/** Get path to docs directory */
export function getDocsPath(): string {
	return resolve(join(getPackageDir(), "docs"));
}

/** Get path to examples directory */
export function getExamplesPath(): string {
	return resolve(join(getPackageDir(), "examples"));
}

/** Get path to CHANGELOG.md */
export function getChangelogPath(): string {
	return resolve(join(getPackageDir(), "CHANGELOG.md"));
}

/**
 * Get path to built-in interactive assets directory.
 * - For Bun binary: assets/ next to executable
 * - For Node.js (dist/): dist/modes/interactive/assets/
 * - For source (src/): src/modes/interactive/assets/
 */
export function getInteractiveAssetsDir(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "assets");
	}
	const packageDir = getPackageDir();
	const srcOrDist = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, srcOrDist, "modes", "interactive", "assets");
}

/** Get path to a bundled interactive asset */
export function getBundledInteractiveAssetPath(name: string): string {
	return join(getInteractiveAssetsDir(), name);
}

let embeddedQuickJSWasmPath: string | undefined;

/** Called by the Bun entry with the path of the QuickJS wasm file embedded in the compiled executable. */
export function setEmbeddedQuickJSWasmPath(path: string): void {
	embeddedQuickJSWasmPath = path;
}

/** Get path to `quickjs-wasi/quickjs.wasm`, the VM that runs codemode scripts. */
export function getQuickJSWasmPath(): string {
	return embeddedQuickJSWasmPath ?? createRequire(import.meta.url).resolve("quickjs-wasi/quickjs.wasm");
}

/** Resolve the codemode worker entry for a release runtime. */
export function resolveCodemodeWorkerSpecifier(
	runtime: "bun-binary" | "bundled-node" | "unbundled",
	moduleUrl: string,
): string | URL | undefined {
	// Bun embeds explicit source entrypoints, but on Windows Bun 1.3 cannot map an absolute
	// B:\~BUN URL back to one. A relative string with the original source extension works on
	// every Bun platform.
	if (runtime === "bun-binary") return "./src/extensions/codemode/worker.ts";
	if (runtime === "bundled-node") return new URL("./codemode-worker.js", moduleUrl);
	return undefined;
}

/**
 * Get the codemode worker entry, or undefined to use the worker that ships next to pi-codemode.
 * The Bun and Node release builds both pass the worker as an extra entrypoint.
 */
export function getCodemodeWorkerSpecifier(): string | URL | undefined {
	const runtime = isBunBinary ? "bun-binary" : isBundledNode ? "bundled-node" : "unbundled";
	return resolveCodemodeWorkerSpecifier(runtime, import.meta.url);
}

// =============================================================================
// App Config (from package.json eaonConfig)
// =============================================================================

interface PackageJson {
	name?: string;
	version?: string;
	eaonConfig?: {
		name?: string;
		configDir?: string;
	};
}

let pkg: PackageJson = {};
try {
	pkg = JSON.parse(stripBom(readFileSync(getPackageJsonPath(), "utf-8"))) as PackageJson;
} catch (e: unknown) {
	const err = e as NodeJS.ErrnoException;
	if (err.code !== "ENOENT") throw e;
}

const eaonConfigName: string | undefined = pkg.eaonConfig?.name;
export const PACKAGE_NAME: string = pkg.name || "@eaonlabs/eaon-code";
export const EAON_CODE_PACKAGE_NAME = "@eaonlabs/eaon-code";
export const APP_NAME: string = eaonConfigName || "eaon-code";
export const APP_TITLE: string = eaonConfigName ? APP_NAME : "Eaon Code";
export const CONFIG_DIR_NAME: string = pkg.eaonConfig?.configDir || ".eaon";
export const LEGACY_CONFIG_DIR_NAME = ".pi";
export const VERSION: string = pkg.version || "0.0.0";

// e.g., EAON_CODE_CODING_AGENT_DIR — sanitize hyphens so the name is a valid env var
const ENV_APP_PREFIX = APP_NAME.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
export const ENV_AGENT_DIR = `${ENV_APP_PREFIX}_CODING_AGENT_DIR`;
export const ENV_SESSION_DIR = `${ENV_APP_PREFIX}_CODING_AGENT_SESSION_DIR`;

export function expandTildePath(path: string): string {
	return normalizePath(path);
}

/** Get the share viewer URL for a gist ID. */
export function getShareViewerUrl(gistId: string): string {
	const baseUrl = process.env.EAON_CODE_SHARE_VIEWER_URL ?? process.env.PI_SHARE_VIEWER_URL;
	return baseUrl ? `${baseUrl}#${gistId}` : `https://gist.github.com/${gistId}`;
}

// =============================================================================
// User Config Paths (~/.eaon/agent/*)
// =============================================================================

/** Get the project config directory, preferring the Eaon name and preserving an existing legacy directory. */
export function getProjectConfigDir(cwd: string): string {
	const projectDir = resolve(cwd, CONFIG_DIR_NAME);
	if (existsSync(projectDir) || CONFIG_DIR_NAME === LEGACY_CONFIG_DIR_NAME) {
		return projectDir;
	}
	const legacyProjectDir = resolve(cwd, LEGACY_CONFIG_DIR_NAME);
	return existsSync(legacyProjectDir) ? legacyProjectDir : projectDir;
}

/** Get the agent config directory (e.g., ~/.eaon/agent/). */
export function getAgentDir(): string {
	// Prefer the Eaon env var; continue honoring the old override and directory until users migrate.
	const envDir = process.env[ENV_AGENT_DIR] ?? process.env.PI_CODING_AGENT_DIR;
	if (envDir) {
		return expandTildePath(envDir);
	}
	const agentDir = join(homedir(), CONFIG_DIR_NAME, "agent");
	if (CONFIG_DIR_NAME === LEGACY_CONFIG_DIR_NAME || existsSync(agentDir)) {
		return agentDir;
	}
	const legacyAgentDir = join(homedir(), LEGACY_CONFIG_DIR_NAME, "agent");
	return existsSync(legacyAgentDir) ? legacyAgentDir : agentDir;
}

/** Get path to user's custom themes directory */
export function getCustomThemesDir(): string {
	return join(getAgentDir(), "themes");
}

/** Get path to models.json */
export function getModelsPath(): string {
	return join(getAgentDir(), "models.json");
}

/** Get path to auth.json */
export function getAuthPath(): string {
	return join(getAgentDir(), "auth.json");
}

/** Get path to settings.json */
export function getSettingsPath(): string {
	return join(getAgentDir(), "settings.json");
}

/** Get path to tools directory */
export function getToolsDir(): string {
	return join(getAgentDir(), "tools");
}

/** Get path to managed binaries directory (fd, rg) */
export function getBinDir(): string {
	return join(getAgentDir(), "bin");
}

/** Get path to prompt templates directory */
export function getPromptsDir(): string {
	return join(getAgentDir(), "prompts");
}

/** Get path to sessions directory */
export function getSessionsDir(): string {
	return join(getAgentDir(), "sessions");
}

/** Get path to debug log file */
export function getDebugLogPath(): string {
	return join(getAgentDir(), `${APP_NAME}-debug.log`);
}
