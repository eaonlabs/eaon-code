import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryModelsStore } from "@eaonlabs/eaon-ai";
import { afterEach, describe, expect, it } from "vitest";
import { AuthStorage } from "../src/core/auth-storage.ts";
import { ModelRuntime } from "../src/core/model-runtime.ts";

let tempDir: string | undefined;

afterEach(() => {
	if (tempDir) rmSync(tempDir, { recursive: true, force: true });
	tempDir = undefined;
});

describe("keyless custom providers", () => {
	it("exposes models and resolves empty auth when noAuth is enabled", async () => {
		tempDir = mkdtempSync(join(tmpdir(), "eaon-no-auth-models-"));
		const modelsPath = join(tempDir, "models.json");
		writeFileSync(
			modelsPath,
			JSON.stringify({
				providers: {
					local: {
						baseUrl: "http://localhost:1234/v1",
						api: "openai-completions",
						noAuth: true,
						models: [{ id: "model-without-auth" }],
					},
				},
			}),
		);

		const runtime = await ModelRuntime.create({
			credentials: AuthStorage.inMemory(),
			modelsPath,
			modelsStore: new InMemoryModelsStore(),
			allowModelNetwork: false,
		});

		expect(runtime.getAvailableSnapshot().map((model) => model.id)).toContain("model-without-auth");
		expect(runtime.getProviderAuthStatus("local")).toMatchObject({ configured: true, source: "no_auth" });
		expect(await runtime.getAuth("local")).toMatchObject({
			auth: { headers: { Authorization: null } },
			source: "No API key required",
		});
		expect(runtime.getProvider("local")?.auth.apiKey?.login).toBeUndefined();
	});
});
