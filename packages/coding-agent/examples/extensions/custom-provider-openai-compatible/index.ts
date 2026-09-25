/**
 * Custom OpenAI-compatible Provider Example
 *
 * Registers two custom providers that talk to any OpenAI-compatible endpoint
 * (Ollama, vLLM, LM Studio, LiteLLM, corporate proxies, ...). Streaming is
 * handled by eaon-ai's built-in API implementations, so no custom stream code
 * is needed:
 *
 * - openai-compatible-completions → Chat Completions API (POST /chat/completions)
 * - openai-compatible-responses   → Responses API (POST /responses)
 *
 * Configuration (environment variables):
 *   OPENAI_COMPAT_BASE_URL  API base URL (default: http://localhost:8080/v1)
 *   OPENAI_COMPAT_API_KEY   API key sent as Authorization: Bearer … — set it to
 *                           any non-empty value (e.g. "local") for keyless
 *                           local servers
 *   OPENAI_COMPAT_MODELS    Comma-separated model ids (e.g. "qwen3:8b,llama3"),
 *                           used when the server's GET /models is unreachable
 *
 * Usage:
 *   OPENAI_COMPAT_BASE_URL=http://localhost:8080/v1 OPENAI_COMPAT_API_KEY=local \
 *     pi -e ./packages/coding-agent/examples/extensions/custom-provider-openai-compatible
 *
 * Then use /model to pick one of the openai-compatible-* models.
 */

import type { Api } from "@eaonlabs/eaon-ai";
import type { ExtensionAPI } from "@eaonlabs/eaon-code";

const DEFAULT_BASE_URL = "http://localhost:8080/v1";

export function getBaseUrl(): string {
	const raw = process.env.OPENAI_COMPAT_BASE_URL?.trim() || DEFAULT_BASE_URL;
	return raw.replace(/\/+$/, "");
}

interface CompatModelsResponse {
	data?: Array<{
		id?: string;
		object?: string;
		context_window?: number;
		max_output_tokens?: number;
		max_tokens?: number;
	}>;
}

/** Model definition shape accepted by eaon.registerProvider(). */
export interface CompatModelConfig {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
}

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

function toModelConfig(id: string, contextWindow: number, maxTokens: number): CompatModelConfig {
	return {
		id,
		name: id,
		reasoning: false,
		input: ["text"],
		cost: { ...ZERO_COST },
		contextWindow,
		maxTokens,
	};
}

/** Lists models from GET /models, falling back to $OPENAI_COMPAT_MODELS. */
export async function fetchCompatModels(baseUrl: string = getBaseUrl()): Promise<CompatModelConfig[]> {
	const explicitModels = (process.env.OPENAI_COMPAT_MODELS ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);

	try {
		const headers: Record<string, string> = { Accept: "application/json" };
		const apiKey = process.env.OPENAI_COMPAT_API_KEY?.trim();
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
		const response = await fetch(`${baseUrl}/models`, {
			headers,
			signal: AbortSignal.timeout(3000),
		});
		if (!response.ok) throw new Error(`GET /models failed: HTTP ${response.status}`);
		const body = (await response.json()) as CompatModelsResponse;
		const models = (body.data ?? [])
			.filter((entry) => typeof entry.id === "string" && entry.id.length > 0)
			.map((entry) =>
				toModelConfig(
					entry.id!,
					typeof entry.context_window === "number" && entry.context_window > 0 ? entry.context_window : 128000,
					typeof entry.max_output_tokens === "number" && entry.max_output_tokens > 0
						? entry.max_output_tokens
						: typeof entry.max_tokens === "number" && entry.max_tokens > 0
							? entry.max_tokens
							: 16384,
				),
			);
		if (models.length > 0) return models;
		throw new Error("GET /models returned no models");
	} catch (error) {
		if (explicitModels.length === 0) {
			console.warn(
				`[custom-provider-openai-compatible] Could not list models from ${baseUrl}/models ` +
					`(${error instanceof Error ? error.message : String(error)}). ` +
					`Set OPENAI_COMPAT_MODELS to register models explicitly; skipping.`,
			);
			return [];
		}
	}

	return explicitModels.map((id) => toModelConfig(id, 128000, 16384));
}

export default async function (eaon: ExtensionAPI) {
	const baseUrl = getBaseUrl();
	const models = await fetchCompatModels(baseUrl);
	if (models.length === 0) return;

	for (const [id, name, api] of [
		["openai-compatible-completions", "OpenAI-compatible (Chat Completions)", "openai-completions"],
		["openai-compatible-responses", "OpenAI-compatible (Responses)", "openai-responses"],
	] as const) {
		eaon.registerProvider(id, {
			name,
			baseUrl,
			apiKey: "$OPENAI_COMPAT_API_KEY",
			api: api as Api,
			models,
		});
	}
}
