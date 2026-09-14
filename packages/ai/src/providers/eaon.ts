import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Model, type Provider, type RefreshModelsContext } from "../models.ts";

export const EAON_BASE = "https://ai.eaon.dev/v1";

interface EaonModelEntry {
	id?: string;
	object?: string;
	owned_by?: string;
	context_window?: number;
	eaon?: {
		cost_tier?: string;
		max_output_tokens?: number;
	};
}

interface EaonModelsResponse {
	object?: string;
	data?: EaonModelEntry[];
}

const TIER_REASONING: Record<string, boolean> = {
	frontier: true,
	standard: true,
	flash: false,
};

function toEaonModel(entry: EaonModelEntry): Model<"openai-completions"> | undefined {
	const id = entry.id;
	if (!id || id.length === 0) return undefined;
	const tier = entry.eaon?.cost_tier?.toLowerCase() ?? "";
	const reasoning =
		id === "eaon/auto" ? false : (TIER_REASONING[tier] ?? /sol|astra|opus|grok|pro|reason/i.test(id));
	const contextWindow = typeof entry.context_window === "number" && entry.context_window > 0 ? entry.context_window : 200000;
	const maxTokens = typeof entry.eaon?.max_output_tokens === "number" && entry.eaon.max_output_tokens > 0 ? entry.eaon.max_output_tokens : 16000;
	const owner = entry.owned_by ? ` · ${entry.owned_by}` : "";
	const tierLabel = tier ? ` · ${tier}` : "";
	return {
		id,
		name: `${id.replace(/^eaon\//, "")}${tierLabel}${owner}`,
		api: "openai-completions",
		provider: "eaon",
		baseUrl: EAON_BASE,
		reasoning,
		input: ["text"] as const,
		// Real metering is server-side; client costs stay 0 so we don't invent prices.
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow,
		maxTokens,
		...(reasoning
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

/** Always available — gateway picks the cheapest capable model for the call. */
const EAON_AUTO: Model<"openai-completions"> = toEaonModel({
	id: "eaon/auto",
	owned_by: "eaon",
	context_window: 200000,
	eaon: { cost_tier: "flash", max_output_tokens: 16000 },
})!;

async function fetchEaonModels(context: RefreshModelsContext): Promise<Model<"openai-completions">[]> {
	const apiKey = context.credential?.type === "api_key" ? context.credential.key : undefined;
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	const response = await fetch(`${EAON_BASE}/models`, {
		headers,
		signal: context.signal,
	});
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`Eaon Plan GET /v1/models failed: HTTP ${response.status}${body ? ` ${body.slice(0, 160)}` : ""}`);
	}
	const body = (await response.json()) as EaonModelsResponse;
	const models: Model<"openai-completions">[] = [];
	for (const entry of body.data ?? []) {
		const model = toEaonModel(entry);
		if (model) models.push(model);
	}
	if (models.length === 0) {
		throw new Error("Eaon Plan GET /v1/models returned no models (check plan / key)");
	}
	// Ensure eaon/auto is present even if the gateway omits it from the list
	if (!models.some((m) => m.id === "eaon/auto")) {
		models.unshift(EAON_AUTO);
	}
	return models;
}

/**
 * Eaon Plan — OpenAI-compatible gateway at https://ai.eaon.dev
 * Docs: https://ai.eaon.dev/docs
 * Key: eaon_sk_… from https://ai.eaon.dev/dashboard/keys (or EAON_API_KEY)
 * Models: live GET /v1/models (plan-scoped list + eaon/auto).
 */
export function eaonProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "eaon",
		name: "Eaon Plan",
		baseUrl: EAON_BASE,
		auth: {
			apiKey: envApiKeyAuth("Eaon Plan API key (eaon_sk_… from https://ai.eaon.dev)", ["EAON_API_KEY", "OPENAI_API_KEY"]),
		},
		// Baseline: auto-router only; full plan catalogue arrives via fetchModels
		models: [EAON_AUTO],
		fetchModels: fetchEaonModels,
		api: {
			"openai-completions": openAICompletionsApi(),
		},
	});
}
