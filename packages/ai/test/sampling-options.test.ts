import { describe, expect, it } from "vitest";
import { stream, streamSimple } from "../src/compat.ts";
import type { Api, Context, Model, SimpleStreamOptions, StreamOptions } from "../src/types.ts";

interface SamplingPayload {
	temperature?: number;
	top_p?: number;
	top_k?: number;
	min_p?: number;
}

class PayloadCaptured extends Error {
	constructor() {
		super("payload captured");
		this.name = "PayloadCaptured";
	}
}

function makeContext(): Context {
	return {
		messages: [{ role: "user", content: "Hello", timestamp: Date.now() }],
	};
}

function makeModel(
	api: Api,
	samplingParams?: Record<string, unknown>,
	overrides?: Partial<Pick<Model<Api>, "reasoning" | "samplingParamsByThinkingLevel" | "thinkingLevelMap">>,
): Model<Api> {
	return {
		id: "custom-model",
		name: "Custom Model",
		api,
		provider: "custom-provider",
		baseUrl: "http://127.0.0.1:9/v1",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16384,
		samplingParams,
		...overrides,
	};
}

function capturingOptions(onCapture: (payload: SamplingPayload) => void) {
	return {
		apiKey: "fake-key",
		onPayload: (payload: unknown) => {
			onCapture(payload as SamplingPayload);
			throw new PayloadCaptured();
		},
	};
}

async function capturePayload(model: Model<Api>, options?: StreamOptions): Promise<SamplingPayload> {
	let capturedPayload: SamplingPayload | undefined;

	const result = await stream(model, makeContext(), {
		...options,
		...capturingOptions((payload) => {
			capturedPayload = payload;
		}),
	}).result();

	if (!capturedPayload) {
		throw new Error(
			`Expected payload to be captured before request failure: ${result.errorMessage ?? result.stopReason}`,
		);
	}

	return capturedPayload;
}

async function captureSimplePayload(model: Model<Api>, options?: SimpleStreamOptions): Promise<SamplingPayload> {
	let capturedPayload: SamplingPayload | undefined;

	const result = await streamSimple(model, makeContext(), {
		...options,
		...capturingOptions((payload) => {
			capturedPayload = payload;
		}),
	}).result();

	if (!capturedPayload) {
		throw new Error(
			`Expected payload to be captured before request failure: ${result.errorMessage ?? result.stopReason}`,
		);
	}

	return capturedPayload;
}

describe("sampling params", () => {
	it("merges request sampling params into the request body", async () => {
		const payload = await capturePayload(makeModel("openai-completions"), {
			samplingParams: { top_p: 0.95, top_k: 0, min_p: 0 },
		});

		expect(payload.top_p).toBe(0.95);
		expect(payload.top_k).toBe(0);
		expect(payload.min_p).toBe(0);
	});

	it("omits sampling params when neither options nor model set them", async () => {
		const payload = await capturePayload(makeModel("openai-completions"));

		expect(payload.temperature).toBeUndefined();
		expect(payload.top_p).toBeUndefined();
	});

	// Model defaults must apply to direct stream()/complete() calls, not only streamSimple() (#9506)
	it.each(["openai-completions", "openai-responses", "azure-openai-responses"] as const)(
		"applies model-level sampling params with request keys taking precedence for %s",
		async (api) => {
			const payload = await capturePayload(makeModel(api, { top_p: 0.95, min_p: 0.05 }), {
				samplingParams: { top_p: 0.5 },
			});

			expect(payload.top_p).toBe(0.5);
			expect(payload.min_p).toBe(0.05);
		},
	);

	it.each(["openai-completions", "openai-responses", "azure-openai-responses"] as const)(
		"selects sampling params for the thinking level and applies request params last for %s",
		async (api) => {
			const model = makeModel(
				api,
				{ temperature: 1, top_p: 0.95 },
				{ reasoning: true, samplingParamsByThinkingLevel: { high: { temperature: 0.8, top_k: 64 } } },
			);
			const payload = await captureSimplePayload(model, {
				reasoning: "high",
				samplingParams: { top_k: 40 },
			});

			expect(payload.temperature).toBe(0.8);
			expect(payload.top_p).toBe(0.95);
			expect(payload.top_k).toBe(40);
		},
	);

	it("passes request sampling params through streamSimple", async () => {
		let payload: SamplingPayload | undefined;

		await streamSimple(makeModel("openai-completions"), makeContext(), {
			samplingParams: { top_p: 0.5 },
			...capturingOptions((captured) => {
				payload = captured;
			}),
		}).result();

		expect(payload?.top_p).toBe(0.5);
	});

	it("overrides named request fields", async () => {
		const payload = await capturePayload(makeModel("openai-completions"), {
			temperature: 0,
			samplingParams: { temperature: 1 },
		});

		expect(payload.temperature).toBe(1);
	});

	it("is ignored by non-OpenAI-compatible APIs", async () => {
		const payload = await capturePayload(makeModel("anthropic-messages"), {
			samplingParams: { top_p: 0.9, top_k: 40 },
		});

		expect(payload.top_p).toBeUndefined();
		expect(payload.top_k).toBeUndefined();
	});
});
