import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Model, type Provider } from "../models.ts";

const EAON_BASE = "https://ai.eaon.dev/v1";

function eaonModel(id: string, name: string, opts: { reasoning?: boolean; contextWindow?: number } = {}): Model<"openai-completions"> {
	return {
		id,
		name,
		api: "openai-completions",
		provider: "eaon",
		baseUrl: EAON_BASE,
		reasoning: opts.reasoning ?? false,
		input: ["text"] as const,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: opts.contextWindow ?? 200000,
		maxTokens: 32000,
		...(opts.reasoning
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

const EAON_MODELS: Model<"openai-completions">[] = [
	eaonModel("eaon-auto", "Eaon Auto", { reasoning: true, contextWindow: 200000 }),
	eaonModel("eaon-fast", "Eaon Fast", { reasoning: false, contextWindow: 128000 }),
];

/**
 * Eaon Plan — OpenAI-compatible gateway at https://ai.eaon.dev
 * Paste an Eaon Plan API key (or set EAON_API_KEY).
 */
export function eaonProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "eaon",
		name: "Eaon Plan",
		auth: { apiKey: envApiKeyAuth("Eaon Plan API key (https://ai.eaon.dev)", ["EAON_API_KEY"]) },
		models: EAON_MODELS,
		api: {
			"openai-completions": openAICompletionsApi(),
		},
	});
}
