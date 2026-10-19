import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import type { ApiKeyAuth } from "../auth/types.ts";
import { createProvider, type Provider } from "../models.ts";
import type { Model } from "../types.ts";

const EAON_GATEWAY_URL = "https://gateway.eaon.dev/v1";

const eaonModels: Model<"openai-completions">[] = [
	{
		id: "mimo-v2.6-flash-free",
		name: "MiMo v2.6 Flash",
		api: "openai-completions",
		provider: "eaon",
		baseUrl: EAON_GATEWAY_URL,
		input: ["text"],
		reasoning: true,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 64_000,
		maxTokens: 8_192,
	},
	{
		id: "muse-spark-1.3-contributor-free",
		name: "Muse Spark 1.3 Contributor",
		api: "openai-completions",
		provider: "eaon",
		baseUrl: EAON_GATEWAY_URL,
		input: ["text"],
		reasoning: true,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 64_000,
		maxTokens: 8_192,
	},
	{
		id: "gpt-6-luna-free",
		name: "GPT-6-Luna",
		api: "openai-completions",
		provider: "eaon",
		baseUrl: EAON_GATEWAY_URL,
		input: ["text"],
		reasoning: true,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 64_000,
		maxTokens: 8_192,
	},
];

const noApiKeyRequired: ApiKeyAuth = {
	name: "No API key required",
	check: async () => ({ type: "api_key", source: "No API key required" }),
	resolve: async ({ signal }) => {
		signal.throwIfAborted();
		return { auth: { headers: { Authorization: null } }, source: "No API key required" };
	},
};

export function eaonProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "eaon",
		name: "Eaon",
		baseUrl: EAON_GATEWAY_URL,
		auth: { apiKey: noApiKeyRequired },
		models: eaonModels,
		api: openAICompletionsApi(),
	});
}
