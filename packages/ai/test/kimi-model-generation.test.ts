import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { Api, Model } from "../src/types.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoots: string[] = [];

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("Kimi Coding model generation", () => {
	it("maps the current global code-plan catalog to the public provider", () => {
		// Given: the current models.dev provider id and its four public models.
		const root = mkdtempSync(join(tmpdir(), "eaon-kimi-generation-"));
		temporaryRoots.push(root);
		const preloadPath = join(root, "mock-catalog.mjs");
		const outputPath = join(root, "catalog");
		const models = Object.fromEntries(
			[
				["k3", 1_048_576, 131_072],
				["k3-256k", 262_144, 131_072],
				["kimi-for-coding", 1_048_576, 32_768],
				["kimi-for-coding-highspeed", 262_144, 32_768],
			].map(([id, context, output]) => [
				id,
				{
					id,
					name: id,
					tool_call: true,
					reasoning: true,
					modalities: { input: ["text", "image"], output: ["text"] },
					cost: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
					limit: { context, output },
				},
			]),
		);
		const catalog = { "kimi-code-plan-global": { models } };
		writeFileSync(
			preloadPath,
			`const catalog = ${JSON.stringify(catalog)};\n` +
				`globalThis.fetch = async (input) => {\n` +
				`  const url = String(input);\n` +
				`  if (url === "https://models.dev/api.json") return Response.json(catalog);\n` +
				`  if (url === "https://openrouter.ai/api/v1/models" || url === "https://ai-gateway.vercel.sh/v1/models") return Response.json({ data: [] });\n` +
				`  throw new Error(\`Unexpected fetch: \${url}\`);\n` +
				`};\n`,
		);

		// When: the public JSON model catalog is generated.
		const result = spawnSync(
			process.execPath,
			[
				"--import",
				pathToFileURL(preloadPath).href,
				"scripts/generate-models.ts",
				"--json-only",
				"--json-output",
				outputPath,
			],
			{ cwd: packageRoot, encoding: "utf8", timeout: 10_000 },
		);
		expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
		const providers = JSON.parse(readFileSync(join(outputPath, "providers.json"), "utf8")) as string[];

		// Then: Eaon's stable provider id contains every current Kimi model.
		expect(providers).toContain("kimi-coding");
		const generated = JSON.parse(readFileSync(join(outputPath, "providers/kimi-coding.json"), "utf8")) as Record<
			string,
			Model<Api>
		>;
		expect(Object.keys(generated).sort()).toEqual(["k3", "k3-256k", "kimi-for-coding", "kimi-for-coding-highspeed"]);
		expect(generated.k3.cost).toEqual({ input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 });
		expect(generated["k3-256k"].cost).toEqual({ input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 });
	});
});
