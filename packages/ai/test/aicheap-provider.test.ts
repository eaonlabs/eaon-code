import { afterEach, describe, expect, it, vi } from "vitest";
import type { RefreshModelsContext } from "../src/models.ts";
import { AICHEAP_BASE, aicheapProvider } from "../src/providers/aicheap.ts";
import type { Model } from "../src/types.ts";
import { normalizeContext } from "../src/utils/transcript.ts";

afterEach(() => {
	vi.unstubAllGlobals();
});

function refreshContext(key = "test-aicheap-key"): RefreshModelsContext {
	return {
		credential: { type: "api_key", key },
		allowNetwork: true,
		signal: new AbortController().signal,
		publish: async ({ update }) => {
			update?.();
			return true;
		},
	};
}

describe("AICheap provider", () => {
	it("loads available model IDs from the authenticated OpenAI-compatible /v1/models endpoint", async () => {
		const fetch = vi.fn(
			async (_input: Parameters<typeof globalThis.fetch>[0], _init?: RequestInit) =>
				new Response(
					JSON.stringify({
						object: "list",
						data: [
							{ id: "gpt-5.4", context_length: 256000, max_output_tokens: 32000 },
							{
								id: "claude-sonnet-5",
								input_modalities: ["text", "image"],
								supported_parameters: ["reasoning_effort"],
							},
							{ object: "model" },
						],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
		);
		vi.stubGlobal("fetch", fetch);

		const provider = aicheapProvider();
		expect(provider.id).toBe("aicheap");
		expect(provider.name).toBe("AICheap");
		expect(provider.getModels()).toEqual([]);

		await provider.refreshModels?.(refreshContext());

		expect(fetch).toHaveBeenCalledOnce();
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe(`${AICHEAP_BASE}/models`);
		expect(init?.headers).toMatchObject({
			Accept: "application/json",
			Authorization: "Bearer test-aicheap-key",
			"x-bf-vk": "test-aicheap-key",
		});
		expect(provider.getModels()).toEqual([
			expect.objectContaining({
				id: "gpt-5.4",
				name: "gpt-5.4",
				api: "openai-completions",
				provider: "aicheap",
				baseUrl: AICHEAP_BASE,
				contextWindow: 256000,
				maxTokens: 32000,
			}),
			expect.objectContaining({
				id: "claude-sonnet-5",
				provider: "aicheap",
				input: ["text", "image"],
				reasoning: true,
				compat: { supportsReasoningEffort: true },
			}),
		]);
	});

	it("sends the API key as AICheap's virtual-key header on chat requests", async () => {
		const fetch = vi.fn(
			async (_input: Parameters<typeof globalThis.fetch>[0], _init?: RequestInit) =>
				new Response(JSON.stringify({ error: { message: "test response" } }), {
					status: 401,
					headers: { "content-type": "application/json" },
				}),
		);
		const model: Model<"openai-completions"> = {
			id: "gpt-5.4",
			name: "gpt-5.4",
			api: "openai-completions",
			provider: "aicheap",
			baseUrl: AICHEAP_BASE,
			reasoning: false,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 128000,
			maxTokens: 8192,
		};

		await aicheapProvider()
			.streamSimple(model, normalizeContext({ messages: [{ role: "user", content: "hello", timestamp: 1 }] }), {
				apiKey: "test-aicheap-key",
				fetch,
				cacheRetention: "none",
			})
			.result();

		const call = fetch.mock.calls.at(0);
		expect(call).toBeDefined();
		if (!call) throw new Error("Expected the AICheap chat request to reach fetch");
		const [url, init] = call;
		const headers = new Headers(init?.headers);
		expect(String(url)).toBe(`${AICHEAP_BASE}/chat/completions`);
		expect(headers.get("authorization")).toBe("Bearer test-aicheap-key");
		expect(headers.get("x-bf-vk")).toBe("test-aicheap-key");
	});

	it("keeps the last catalog when a refresh fails", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ data: [{ id: "gpt-5.4" }] }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(new Response("upstream error", { status: 503 }));
		vi.stubGlobal("fetch", fetch);
		const provider = aicheapProvider();

		await provider.refreshModels?.(refreshContext());
		await expect(provider.refreshModels?.(refreshContext())).rejects.toThrow("HTTP 503");

		expect(provider.getModels().map((model) => model.id)).toEqual(["gpt-5.4"]);
	});

	it("does not fetch while running offline", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const provider = aicheapProvider();

		await provider.refreshModels?.({ ...refreshContext(), allowNetwork: false });

		expect(fetch).not.toHaveBeenCalled();
		expect(provider.getModels()).toEqual([]);
	});
});
