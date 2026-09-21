import { afterEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "../src/config.ts";
import { webSearchDdg } from "../src/core/web-access.ts";

afterEach(() => vi.unstubAllGlobals());

describe("built-in web access version", () => {
	it("identifies the current Eaon Code version in its User-Agent", async () => {
		const fetchMock = vi.fn(async (..._args: Parameters<typeof fetch>) => new Response("<html></html>"));
		vi.stubGlobal("fetch", fetchMock);

		await webSearchDdg("version check", 1);

		expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
			"User-Agent": expect.stringContaining(`EaonCode/${VERSION} (`),
		});
	});
});
