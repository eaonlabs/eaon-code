import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

type FakeProvider = {
	name: string;
	getModels(): Array<{ api: string }>;
};

type FakeRuntime = {
	listCredentials(): Promise<Array<{ providerId: string; type: "oauth" | "api_key" }>>;
	getProvider(providerId: string): FakeProvider | undefined;
	getProviderAuthStatus(providerId: string): { configured: boolean };
	refresh(options: { providers: string[]; allowNetwork: boolean }): Promise<void>;
};

type FakeInteractiveMode = {
	session: { modelRuntime: FakeRuntime };
};

const getLogoutProviderOptions = (
	InteractiveMode as unknown as {
		prototype: {
			getLogoutProviderOptions(
				this: FakeInteractiveMode,
			): Promise<Array<{ id: string; name: string; authType: "oauth" | "api_key"; status?: { source?: string } }>>;
		};
	}
).prototype.getLogoutProviderOptions;

const removeConfiguredOpenAIProviderApiKey = (
	InteractiveMode as unknown as {
		prototype: {
			removeConfiguredOpenAIProviderApiKey(this: FakeInteractiveMode, providerId: string): Promise<boolean>;
		};
	}
).prototype.removeConfiguredOpenAIProviderApiKey;

let tempDir: string;

function createFakeInteractiveMode(runtime: FakeRuntime): FakeInteractiveMode {
	return { session: { modelRuntime: runtime } };
}

function writeModelsJson(providers: Record<string, unknown>): void {
	writeFileSync(join(tempDir, "models.json"), JSON.stringify({ providers }));
}

describe("InteractiveMode /logout", () => {
	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "eaon-logout-"));
		vi.stubEnv("PI_CODING_AGENT_DIR", tempDir);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("lists configured OpenAI-compatible providers alongside stored credentials", async () => {
		writeModelsJson({
			"custom-openai": {
				name: "Custom OpenAI",
				api: "openai-completions",
				apiKey: "configured-key",
				models: [{ id: "custom-model" }],
			},
			"custom-anthropic": {
				name: "Custom Anthropic",
				api: "anthropic-messages",
				apiKey: "configured-key",
				models: [{ id: "custom-claude" }],
			},
		});
		const runtime: FakeRuntime = {
			listCredentials: async () => [{ providerId: "stored-oauth", type: "oauth" }],
			getProvider: (providerId) => {
				if (providerId === "custom-openai") {
					return { name: "Custom OpenAI", getModels: () => [{ api: "openai-completions" }] };
				}
				if (providerId === "custom-anthropic") {
					return { name: "Custom Anthropic", getModels: () => [{ api: "anthropic-messages" }] };
				}
				if (providerId === "stored-oauth") {
					return { name: "Stored OAuth", getModels: () => [] };
				}
				return undefined;
			},
			getProviderAuthStatus: () => ({ configured: true }),
			refresh: async () => {},
		};

		const options = await getLogoutProviderOptions.call(createFakeInteractiveMode(runtime));

		expect(options).toMatchObject([
			{ id: "custom-openai", name: "Custom OpenAI", authType: "api_key", status: { source: "models.json" } },
			{ id: "stored-oauth", name: "Stored OAuth", authType: "oauth", status: { source: "stored credential" } },
		]);
	});

	it("removes the configured API key while preserving custom provider models", async () => {
		writeModelsJson({
			"custom-openai": {
				name: "Custom OpenAI",
				api: "openai-completions",
				apiKey: "configured-key",
				models: [{ id: "custom-model" }],
			},
		});
		const refresh = vi.fn(async () => {});
		const runtime: FakeRuntime = {
			listCredentials: async () => [],
			getProvider: () => ({ name: "Custom OpenAI", getModels: () => [{ api: "openai-completions" }] }),
			getProviderAuthStatus: () => ({ configured: true }),
			refresh,
		};

		await expect(
			removeConfiguredOpenAIProviderApiKey.call(createFakeInteractiveMode(runtime), "custom-openai"),
		).resolves.toBe(true);

		const config = JSON.parse(readFileSync(join(tempDir, "models.json"), "utf8")) as {
			providers: Record<string, Record<string, unknown>>;
		};
		expect(config.providers["custom-openai"]).toMatchObject({
			name: "Custom OpenAI",
			api: "openai-completions",
			models: [{ id: "custom-model" }],
		});
		expect(config.providers["custom-openai"]).not.toHaveProperty("apiKey");
		expect(refresh).toHaveBeenCalledWith({ providers: ["custom-openai"], allowNetwork: false });
	});
});
