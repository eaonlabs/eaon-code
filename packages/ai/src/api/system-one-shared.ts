import type {
	ClassifierAnswer,
	ClassifierApi,
	ClassifierContext,
	ClassifierModel,
	ClassifierOptions,
	ClassifierResult,
	ImageContent,
} from "../types.ts";
import { formatProviderError, normalizeProviderError } from "../utils/error-body.ts";
import { isRecord, parseClassifierUsage, postClassifierRequest, requiredNumber } from "./classifier-shared.ts";

/** TypeSafe System One request body without the transport-specific envelope. */
export interface SystemOneWireRequest {
	state: unknown;
	questions: Record<string, unknown>;
	assets?: Record<string, { type: "image"; format: "png" | "jpeg"; data_base64: string }>;
	images?: string[];
}

export type SystemOneImageInput = "assets" | "images" | "state-image-urls";

export interface SystemOneCompat {
	imageInput: SystemOneImageInput;
	sendImageOptInHeader: boolean;
}

/** Differences between services that serve System One models. */
export interface SystemOneTransport {
	/** Classifier API implemented by this transport. */
	api: ClassifierApi;
	/** Service name used in error messages. */
	label: string;
	/** Image wire format and any required opt-in, derived from the provider and model. */
	detectCompat(model: ClassifierModel<ClassifierApi>): SystemOneCompat;
	/** Absolute request URL. */
	url(model: ClassifierModel<ClassifierApi>): URL;
	/** Wraps the System One request in the service's request envelope. */
	payload(model: ClassifierModel<ClassifierApi>, request: SystemOneWireRequest): unknown;
	/** Extracts the System One output (`{ answers, usage }`) from the service's response envelope. */
	output(body: unknown): Record<string, unknown>;
}

function probabilities(label: string, value: unknown, id: string): Record<string, number> {
	if (!isRecord(value)) throw new Error(`${label} returned invalid probabilities for ${id}`);
	return Object.fromEntries(
		Object.entries(value).map(([key, probability]) => [
			key,
			requiredNumber(label, probability, `probability for ${id}.${key}`),
		]),
	);
}

function parseAnswers(label: string, value: unknown, context: ClassifierContext): Record<string, ClassifierAnswer> {
	if (!isRecord(value)) throw new Error(`${label} returned an unexpected response`);
	const answers: Array<[string, ClassifierAnswer]> = [];
	for (const [id, question] of Object.entries(context.questions)) {
		const answer = value[id];
		if (!isRecord(answer)) throw new Error(`${label} did not return an answer for ${id}`);
		if (question.type === "choice") {
			if (answer.type !== "choice" || typeof answer.choice !== "string") {
				throw new Error(`${label} did not return a choice answer for ${id}`);
			}
			answers.push([
				id,
				{
					type: "choice",
					choice: answer.choice,
					probabilities: probabilities(label, answer.probabilities, id),
					confidence: requiredNumber(label, answer.confidence, `confidence for ${id}`),
				},
			]);
		} else if (question.type === "score") {
			if (answer.type !== "score") throw new Error(`${label} did not return a score answer for ${id}`);
			answers.push([
				id,
				{
					type: "score",
					score: requiredNumber(label, answer.score, `score for ${id}`),
					confidence: requiredNumber(label, answer.confidence, `confidence for ${id}`),
				},
			]);
		} else {
			if (answer.type !== "noul") throw new Error(`${label} did not return a bool answer for ${id}`);
			answers.push([
				id,
				{
					type: "bool",
					probability: requiredNumber(label, answer.noul, `probability for ${id}`),
				},
			]);
		}
	}
	return Object.fromEntries(answers);
}

/** Maps public `bool` questions to TypeSafe's wire-level `noul` type. */
function wireRequest(context: ClassifierContext): SystemOneWireRequest {
	return {
		state: context.state,
		questions: Object.fromEntries(
			Object.entries(context.questions).map(([id, question]) => [
				id,
				question.type === "bool" ? { ...question, type: "noul" } : question,
			]),
		),
	};
}

function addImages(
	label: string,
	model: ClassifierModel<ClassifierApi>,
	input: SystemOneImageInput,
	images: ImageContent[],
	request: SystemOneWireRequest,
): void {
	if (input === "images") {
		if (images.length > 4) throw new Error(`${label} accepts at most 4 images for ${model.id}, got ${images.length}`);
		request.images = images.map((image) => {
			if (!["image/png", "image/jpeg", "image/webp"].includes(image.mimeType)) {
				throw new Error(`${label} accepts PNG, JPEG, and WebP images for ${model.id}, got ${image.mimeType}`);
			}
			return `data:${image.mimeType};base64,${image.data}`;
		});
		return;
	}
	if (input === "state-image-urls") {
		request.state = [
			...images.map((image) => ({
				type: "image_url",
				image_url: { url: `data:${image.mimeType};base64,${image.data}` },
			})),
			request.state,
		];
		return;
	}
	const assets: NonNullable<SystemOneWireRequest["assets"]> = {};
	images.forEach((image, index) => {
		const format = image.mimeType === "image/png" ? "png" : image.mimeType === "image/jpeg" ? "jpeg" : undefined;
		if (!format) throw new Error(`${label} accepts PNG and JPEG images for ${model.id}, got ${image.mimeType}`);
		assets[`<image-${index + 1}>`] = { type: "image", format, data_base64: image.data };
	});
	request.assets = assets;
	request.state = [...Object.keys(assets), request.state];
}

/** Runs one System One classification over the given transport. */
export async function classifySystemOne(
	transport: SystemOneTransport,
	model: ClassifierModel<ClassifierApi>,
	context: ClassifierContext,
	options: ClassifierOptions | undefined,
): Promise<ClassifierResult> {
	const output: ClassifierResult = {
		api: model.api,
		provider: model.provider,
		model: model.id,
		answers: {},
		stopReason: "stop",
		timestamp: Date.now(),
	};

	try {
		if (model.api !== transport.api) throw new Error(`Unsupported classifier API: ${model.api}`);
		const request = wireRequest(context);
		let requestOptions = options;
		if (context.images?.length) {
			if (!model.input.includes("image")) {
				throw new Error(`${transport.label} does not support image input for ${model.id}`);
			}
			const compat = transport.detectCompat(model);
			addImages(transport.label, model, compat.imageInput, context.images, request);
			if (compat.sendImageOptInHeader) {
				requestOptions = {
					...options,
					headers: { "TypeSafe-Danger-Zone-Images": "true", ...options?.headers },
				};
			}
		}
		const body = await postClassifierRequest(
			transport.label,
			transport.url(model),
			model,
			transport.payload(model, request),
			requestOptions,
		);
		const result = transport.output(body);
		// Set before parsing answers: a request with malformed answers was still billed.
		const usage = parseClassifierUsage(result.usage, model);
		if (usage) output.usage = usage;
		output.answers = parseAnswers(transport.label, result.answers, context);
		return output;
	} catch (error) {
		output.stopReason = options?.signal?.aborted ? "aborted" : "error";
		output.errorMessage = formatProviderError(normalizeProviderError(error), `${transport.label} error`);
		return output;
	}
}
