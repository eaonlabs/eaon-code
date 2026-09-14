import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Model, type Provider, type RefreshModelsContext } from "../models.ts";

export const EAON_BASE = "https://ai.eaon.dev/v1";

interface OpenAiModelsResponse {
	data?: Array<{ id?: string; owned_by?: string }>;
}

function toEaonModel(id: string, ownedBy?: string): Model<"openai-completions"> {
	const lower = id.toLowerCase();
	const looksReasoning =
		/reason|think|o[0-9]|r1|deepseek-r|claude.*thinking|gpt-[45].*reason/i.test(lower) ||
		(ownedBy && /reason|think/i.test(ownedBy));
	return {
		id,
		name: id,
		api: "openai-completions",
		provider: "eaon",
		baseUrl: EAON_BASE,
		reasoning: looksReasoning,
		input: ["text"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 32000,
		...(looksReasoning
			? {
					thinkingLevelMap: {
						off: null,
						minimal: "minimal",
						low: "low",
						medium: "medium",
						high: "high",
						xhigh: "xhigh",
						max: "max",
					} as const,
				}
			: {}),
	} as Model<"openai-completions">;
}

/** GET /v1/models — OpenAI-compatible list. */
async function fetchEaonModels(context: RefreshModelsContext): Promise<Model<"openai-completions">[]> {
	const apiKey = context.credential?.type === "api_key" ? context.credential.key : undefined;
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	const response = await fetch(`${EAON_BASE}/models`, {
		headers,
		signal: context.signal,
	});
	if (!response.ok) {
		throw new Error(`Eaon Plan /v1/models failed: HTTP ${response.status}`);
	}
	const body = (await response.json()) as OpenAiModelsResponse;
	const ids = (body.data ?? [])
		.map((entry) => entry.id)
		.filter((id): id is string => typeof id === "string" && id.length > 0)
		.sort((a, b) => a.localeCompare(b));
	if (ids.length === 0) {
		throw new Error("Eaon Plan /v1/models returned no models");
	}
	return ids.map((id) => toEaonModel(id));
}

/**
 * Eaon Plan — OpenAI-compatible gateway at https://ai.eaon.dev
 * Paste an Eaon Plan API key (or set EAON_API_KEY).
 * Models are fetched live from GET /v1/models (no hardcoded catalog).
 */
export function eaonProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "eaon",
		name: "Eaon Plan",
		baseUrl: EAON_BASE,
		auth: { apiKey: envApiKeyAuth("Eaon Plan API key (https://ai.eaon.dev)", ["EAON_API_KEY"]) },
		// Empty static catalog — everything comes from fetchModels
		models: [],
		fetchModels: fetchEaonModels,
		api: {
			"openai-completions": openAICompletionsApi(),
		},
	});
}
