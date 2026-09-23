import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider, type RefreshModelsContext } from "../models.ts";
import type { Model, ProviderStreams, StreamOptions } from "../types.ts";

export const AICHEAP_BASE = "https://api.aicheap.io/v1";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function positiveInteger(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function getInputModalities(entry: Record<string, unknown>): readonly ("text" | "image")[] {
	const raw = entry.input_modalities ?? entry.input ?? entry.modalities;
	const values = isUnknownArray(raw) ? raw : isRecord(raw) && isUnknownArray(raw.input) ? raw.input : [];
	return values.includes("image") ? ["text", "image"] : ["text"];
}

function supportsReasoning(entry: Record<string, unknown>): boolean {
	if (typeof entry.reasoning === "boolean") return entry.reasoning;
	return isUnknownArray(entry.supported_parameters) && entry.supported_parameters.includes("reasoning_effort");
}

function toAICheapModel(entry: unknown): Model<"openai-completions"> | undefined {
	if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.trim().length === 0) return undefined;

	const reasoning = supportsReasoning(entry);
	return {
		id: entry.id,
		name: typeof entry.name === "string" && entry.name.length > 0 ? entry.name : entry.id,
		api: "openai-completions",
		provider: "aicheap",
		baseUrl: AICHEAP_BASE,
		reasoning,
		input: [...getInputModalities(entry)],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: positiveInteger(entry.context_window ?? entry.context_length, 128000),
		maxTokens: positiveInteger(entry.max_output_tokens ?? entry.max_tokens, 8192),
		...(reasoning ? { compat: { supportsReasoningEffort: true } } : {}),
	};
}

async function fetchAICheapModels(context: RefreshModelsContext): Promise<Model<"openai-completions">[]> {
	const apiKey = context.credential?.type === "api_key" ? context.credential.key : undefined;
	if (!apiKey) throw new Error("AICheap model discovery requires an API key");

	const response = await fetch(`${AICHEAP_BASE}/models`, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${apiKey}`,
			"x-bf-vk": apiKey,
		},
		signal: context.signal,
	});
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`AICheap GET /v1/models failed: HTTP ${response.status}${body ? ` ${body.slice(0, 160)}` : ""}`);
	}

	const body: unknown = await response.json();
	const entries = isRecord(body) ? body.data : undefined;
	if (!isUnknownArray(entries)) throw new Error("AICheap GET /v1/models returned an invalid model list");

	const models: Model<"openai-completions">[] = [];
	for (const entry of entries) {
		const model = toAICheapModel(entry);
		if (model) models.push(model);
	}
	if (models.length === 0) throw new Error("AICheap GET /v1/models returned no models (check plan / key)");
	return models;
}

function aicheapStreams(): ProviderStreams {
	const streams = openAICompletionsApi();
	const withVirtualKey = (options?: StreamOptions): StreamOptions | undefined => {
		if (!options?.apiKey) return options;
		return { ...options, headers: { ...options.headers, "x-bf-vk": options.apiKey } };
	};
	return {
		stream: (model, context, options) => streams.stream(model, context, withVirtualKey(options)),
		streamSimple: (model, context, options) => streams.streamSimple(model, context, withVirtualKey(options)),
	};
}

export function aicheapProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "aicheap",
		name: "AICheap",
		baseUrl: AICHEAP_BASE,
		auth: { apiKey: envApiKeyAuth("AICheap API key", ["AICHEAP_API_KEY"]) },
		models: [],
		fetchModels: fetchAICheapModels,
		api: aicheapStreams(),
	});
}
