/**
 * Smoke test for the custom OpenAI-compatible providers.
 * Run: npx tsx test.ts [model-id] [--responses]
 *
 * Requires OPENAI_COMPAT_BASE_URL and OPENAI_COMPAT_API_KEY (any non-empty
 * value works for keyless local servers).
 *
 * Examples:
 *   npx tsx test.ts                                  # first model, Chat Completions
 *   npx tsx test.ts qwen3:8b --responses             # named model, Responses API
 */

import type { Context } from "@eaonlabs/eaon-ai";
import { type Model, normalizeContext, openAICompletionsApi, openAIResponsesApi } from "@eaonlabs/eaon-ai/compat";
import { fetchCompatModels, getBaseUrl } from "./index.ts";

async function main() {
	const args = process.argv.slice(2);
	const useResponses = args.includes("--responses");
	const requestedId = args.find((arg) => !arg.startsWith("--"));

	const baseUrl = getBaseUrl();
	const models = await fetchCompatModels(baseUrl);
	const modelDef = models.find((model) => model.id === requestedId) ?? models[0];
	if (!modelDef) {
		console.error(`No models found for ${baseUrl}. Set OPENAI_COMPAT_MODELS or start the server.`);
		process.exit(1);
	}

	const apiKey = process.env.OPENAI_COMPAT_API_KEY?.trim();
	if (!apiKey) {
		console.error("OPENAI_COMPAT_API_KEY is not set (any non-empty value works for keyless local servers).");
		process.exit(1);
	}

	const api = useResponses ? openAIResponsesApi() : openAICompletionsApi();
	const model: Model<"openai-completions" | "openai-responses"> = {
		...modelDef,
		api: useResponses ? "openai-responses" : "openai-completions",
		provider: useResponses ? "openai-compatible-responses" : "openai-compatible-completions",
		baseUrl,
	};

	console.log(`Model: ${model.id}, API: ${model.api}, base URL: ${baseUrl}`);

	const context: Context = {
		messages: [{ role: "user", content: "Say hello in exactly 3 words.", timestamp: Date.now() }],
	};

	const stream = api.streamSimple(model, normalizeContext(context), { apiKey, maxTokens: 64 });

	for await (const event of stream) {
		if (event.type === "thinking_delta") process.stdout.write(event.delta);
		else if (event.type === "text_delta") process.stdout.write(event.delta);
		else if (event.type === "error") console.error("\nError:", event.error.errorMessage);
		else if (event.type === "done") console.log("\n\nDone!", event.reason, event.message.usage);
	}
}

main().catch(console.error);
