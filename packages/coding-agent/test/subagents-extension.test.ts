import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadExtensions } from "../src/core/extensions/loader.ts";
import { hideBundledExtensions } from "../src/extensions/index.ts";
import { getBundledSubagentsExtensionPath } from "../src/extensions/subagents.ts";

describe("bundled subagents extension", () => {
	const temporaryDirectories: string[] = [];

	afterEach(() => {
		for (const directory of temporaryDirectories) {
			rmSync(directory, { recursive: true, force: true });
		}
		temporaryDirectories.length = 0;
	});

	it("loads the pinned extension with its inspector and lifecycle tools", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "eaon-subagents-extension-"));
		temporaryDirectories.push(cwd);
		const extensionPath = getBundledSubagentsExtensionPath();

		expect(existsSync(extensionPath)).toBe(true);

		const result = hideBundledExtensions(await loadExtensions([extensionPath], cwd));

		expect(result.errors).toEqual([]);
		expect(result.extensions).toHaveLength(1);
		expect(result.extensions[0]?.hidden).toBe(true);
		expect(result.extensions[0]?.commands.has("agents")).toBe(true);
		expect(result.extensions[0]?.tools.has("Agent")).toBe(true);
		expect(result.extensions[0]?.tools.has("get_subagent_result")).toBe(true);
		expect(result.extensions[0]?.tools.has("steer_subagent")).toBe(true);
	});
});
