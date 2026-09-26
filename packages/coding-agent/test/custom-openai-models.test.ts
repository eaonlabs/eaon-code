import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpenAICompatibleModelIds } from "../src/core/custom-openai-models.ts";

afterEach(() => vi.unstubAllGlobals());

describe("fetchOpenAICompatibleModelIds", () => {
	it("reads and deduplicates model IDs from an OpenAI-compatible catalog", async () => {
		const fetchMock = vi.fn(async (input: URL) => {
			expect(String(input)).toBe("http://localhost:1234/v1/models");
			return new Response(JSON.stringify({ data: [{ id: "model-a" }, { id: "model-b" }, { id: "model-a" }] }));
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchOpenAICompatibleModelIds("http://localhost:1234/v1/")).resolves.toEqual(["model-a", "model-b"]);
	});

	it("returns an empty list for an empty catalog object", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({}))),
		);

		await expect(fetchOpenAICompatibleModelIds("http://localhost:1234/v1")).resolves.toEqual([]);
	});

	it("throws when the endpoint returns an HTTP error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("unauthorized", { status: 401 })),
		);

		await expect(fetchOpenAICompatibleModelIds("http://localhost:1234/v1")).rejects.toThrow("HTTP 401");
	});
});
