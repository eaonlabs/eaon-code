import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeContext, streamSimple } from "../src/compat.ts";
import { eaonProvider, type GatewayCredentials, gatewaySignatureHeaders } from "../src/providers/eaon.ts";

const credentials: GatewayCredentials = { id: "eaon_app_test", secret: "eaon_as_test" };

describe("Eaon gateway request signing", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("signs method, path, query, body hash, timestamp, and nonce", async () => {
		const body = new TextEncoder().encode('{"model":"claude-haiku-5-5"}');
		const headers = await gatewaySignatureHeaders(
			credentials,
			"post",
			new URL("https://gateway.eaon.dev/v1/chat/completions?stream=1"),
			body,
			1_800_000_000_123,
			"nonce-1",
		);

		const bodyHash = createHash("sha256").update(body).digest("base64url");
		const message = ["eaon-v1", "1800000000", "nonce-1", "POST", "/v1/chat/completions?stream=1", bodyHash].join(
			"\n",
		);
		expect(headers).toEqual({
			"X-Eaon-App": "eaon_app_test",
			"X-Eaon-Timestamp": "1800000000",
			"X-Eaon-Nonce": "nonce-1",
			"X-Eaon-Signature": `v1=${createHmac("sha256", credentials.secret).update(message).digest("base64url")}`,
		});
	});

	it("adds signature headers to provider requests when app credentials are in the provider env", async () => {
		const seen: Headers[] = [];
		vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
			seen.push(new Headers(init?.headers));
			return new Response("data: [DONE]\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
		});

		const model = eaonProvider()
			.getModels()
			.find((candidate) => candidate.id === "claude-haiku-5-5");
		if (!model) throw new Error("claude-haiku-5-5 is not in the Eaon model list");

		const stream = streamSimple(
			model,
			normalizeContext({ messages: [{ role: "user", content: "hi", timestamp: 1 }] }),
			{
				headers: { Authorization: null },
				env: { EAON_GATEWAY_APP_ID: credentials.id, EAON_GATEWAY_APP_SECRET: credentials.secret },
			},
		);
		for await (const event of stream) {
			if (event.type === "done" || event.type === "error") break;
		}

		expect(seen).toHaveLength(1);
		expect(seen[0]?.get("X-Eaon-App")).toBe("eaon_app_test");
		expect(seen[0]?.get("X-Eaon-Signature")).toMatch(/^v1=[A-Za-z0-9_-]+$/);
	});
});
