export async function fetchOpenAICompatibleModelIds(baseUrl: string): Promise<string[]> {
	const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;
	const response = await fetch(new URL("models", normalizedBaseUrl), {
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		throw new Error(`Endpoint returned HTTP ${response.status}`);
	}

	const payload: unknown = await response.json();
	if (typeof payload !== "object" || payload === null || !("data" in payload) || !Array.isArray(payload.data)) {
		return [];
	}

	const modelIds = new Set<string>();
	for (const model of payload.data) {
		if (typeof model !== "object" || model === null || !("id" in model)) continue;
		if (typeof model.id === "string" && model.id.trim()) modelIds.add(model.id.trim());
	}
	return [...modelIds];
}
