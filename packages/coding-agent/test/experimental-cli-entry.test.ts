import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { VERSION } from "../src/config.ts";

const sourceResolverPath = resolve(__dirname, "../src/experimental/source-resolver.ts");
const tempDirs: string[] = [];

afterEach(() => {
	for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function runEntry(entry: string, experimental: boolean, legacyExperimental = false) {
	const directory = mkdtempSync(join(tmpdir(), "eaon-code-cli-boundary-"));
	tempDirs.push(directory);
	const env: NodeJS.ProcessEnv = {
		...process.env,
		HOME: directory,
		USERPROFILE: directory,
		EAON_CODE_CODING_AGENT_DIR: join(directory, "agent"),
		EAON_CODE_OFFLINE: "1",
	};
	delete env.EAON_CODE_EXPERIMENTAL;
	delete env.PI_EXPERIMENTAL;
	env[legacyExperimental ? "PI_EXPERIMENTAL" : "EAON_CODE_EXPERIMENTAL"] = experimental ? "1" : "0";
	return spawnSync(
		process.execPath,
		[
			"--import",
			sourceResolverPath,
			resolve(__dirname, "../src", entry),
			"server",
			"--server-id",
			"invalid",
			"--version",
		],
		{ cwd: directory, encoding: "utf8", timeout: 15_000, env },
	);
}

describe("stable and development CLI entrypoints", () => {
	// #9132: enabling experiments must not pull remote-server dependencies into the published CLI.
	it("does not dispatch experimental commands from the stable entrypoint", () => {
		const result = runEntry("cli.ts", true);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe(VERSION);
	});

	it("keeps experimental dispatch in the development entrypoint", () => {
		const result = runEntry("experimental/cli.ts", true);
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain("Invalid --server-id");
		expect(result.stdout).not.toContain(VERSION);
	});

	it("continues to accept PI_EXPERIMENTAL as a legacy alias", () => {
		const result = runEntry("experimental/cli.ts", true, true);
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain("Invalid --server-id");
	});

	it("falls back to the stable CLI when experiments are disabled", () => {
		const result = runEntry("experimental/cli.ts", false);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe(VERSION);
	});
});
