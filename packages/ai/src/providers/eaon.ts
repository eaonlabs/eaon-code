import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import type { ApiKeyAuth } from "../auth/types.ts";
import { createProvider, type Provider } from "../models.ts";
import type { FetchFunction, Model, ProviderEnv, ProviderStreams } from "../types.ts";
import { getProviderEnvValue } from "../utils/provider-env.ts";

const EAON_GATEWAY_URL = "https://gateway.eaon.dev/v1";
const GATEWAY_APP_ID_ENV = "EAON_GATEWAY_APP_ID";
const GATEWAY_APP_SECRET_ENV = "EAON_GATEWAY_APP_SECRET";

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
	{
		id: "claude-haiku-5-5",
		name: "Claude Haiku 5.5",
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

export type GatewayCredentials = { id: string; secret: string };

function base64url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Headers the gateway requires on every request. The signature is HMAC-SHA256 over the method, path and query,
 * a hash of the body, and a fresh timestamp and nonce, so a captured request cannot be replayed with another body.
 * Matches the Eaon desktop app's signing scheme.
 */
export async function gatewaySignatureHeaders(
	credentials: GatewayCredentials,
	method: string,
	url: URL,
	body: Uint8Array,
	now = Date.now(),
	nonce = base64url(crypto.getRandomValues(new Uint8Array(18))),
): Promise<Record<string, string>> {
	const encoder = new TextEncoder();
	const timestamp = String(Math.floor(now / 1000));
	const bodyHash = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", body)));
	const message = ["eaon-v1", timestamp, nonce, method.toUpperCase(), `${url.pathname}${url.search}`, bodyHash].join(
		"\n",
	);
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(credentials.secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
	return {
		"X-Eaon-App": credentials.id,
		"X-Eaon-Timestamp": timestamp,
		"X-Eaon-Nonce": nonce,
		"X-Eaon-Signature": `v1=${base64url(new Uint8Array(signature))}`,
	};
}

function gatewayCredentials(env: ProviderEnv | undefined): GatewayCredentials | undefined {
	const id = getProviderEnvValue(GATEWAY_APP_ID_ENV, env);
	const secret = getProviderEnvValue(GATEWAY_APP_SECRET_ENV, env);
	return id && secret ? { id, secret } : undefined;
}

function signedGatewayFetch(credentials: GatewayCredentials, baseFetch: FetchFunction): FetchFunction {
	return async (input, init) => {
		const request = new Request(input, init);
		const body = new Uint8Array(await request.arrayBuffer());
		const headers = new Headers(request.headers);
		const signed = await gatewaySignatureHeaders(credentials, request.method, new URL(request.url), body);
		for (const [name, value] of Object.entries(signed)) headers.set(name, value);
		return baseFetch(request.url, {
			method: request.method,
			headers,
			body: body.byteLength > 0 ? body : undefined,
			signal: request.signal,
		});
	};
}

/** Adds request signing when both gateway app credentials are set; otherwise requests go out unsigned. */
function withGatewaySigning<T extends { env?: ProviderEnv; fetch?: FetchFunction }>(
	options: T | undefined,
): T | undefined {
	const credentials = gatewayCredentials(options?.env);
	if (!credentials) return options;
	return { ...options, fetch: signedGatewayFetch(credentials, options?.fetch ?? fetch) } as T;
}

function gatewayApi(api: ProviderStreams): ProviderStreams {
	return {
		...api,
		stream: (model, context, options) => api.stream(model, context, withGatewaySigning(options)),
		streamSimple: (model, context, options) => api.streamSimple(model, context, withGatewaySigning(options)),
	};
}

export function eaonProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "eaon",
		name: "Eaon",
		baseUrl: EAON_GATEWAY_URL,
		auth: { apiKey: noApiKeyRequired },
		models: eaonModels,
		api: gatewayApi(openAICompletionsApi()),
	});
}
