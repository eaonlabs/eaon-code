import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBetterWrightBrowserTools } from "../src/core/betterwright-browser.ts";

const browserMock = vi.hoisted(() => ({
	moduleLoads: 0,
	instances: 0,
	run: vi.fn(
		async (
			code: string,
			_options?: { session?: string },
		): Promise<{ ok: true; result: string } | { ok: false; error: string }> => ({
			ok: true,
			result: code,
		}),
	),
	close: vi.fn(async () => undefined),
}));

vi.mock("betterwright/sdk", () => {
	browserMock.moduleLoads += 1;
	return {
		BetterWright: class {
			run = browserMock.run;
			close = browserMock.close;

			constructor() {
				browserMock.instances += 1;
			}
		},
	};
});

beforeEach(() => {
	browserMock.moduleLoads = 0;
	browserMock.instances = 0;
	browserMock.run.mockClear();
	browserMock.close.mockClear();
});

describe("BetterWright browser integration", () => {
	it("loads on first use and reuses the browser across calls", async () => {
		const tools = createBetterWrightBrowserTools("session-1");
		expect(browserMock.moduleLoads).toBe(0);

		await tools.browser.execute("browser-call", { code: "return page.title()" });
		await tools.browser.execute("second-call", { code: "return snapshot({ diff: true })" });

		expect(browserMock.moduleLoads).toBe(1);
		expect(browserMock.instances).toBe(1);
		expect(browserMock.run).toHaveBeenCalledWith("return page.title()", { session: "session-1" });
		expect(browserMock.run).toHaveBeenCalledTimes(2);
	});

	it("installs a missing managed browser and retries the original request", async () => {
		browserMock.run
			.mockResolvedValueOnce({
				ok: false,
				error: "Managed BetterChromium is outdated or its verified installation receipt is missing.",
			})
			.mockResolvedValueOnce({ ok: true, result: "Example Domain" });
		const installBrowser = vi.fn(async () => undefined);
		const tools = createBetterWrightBrowserTools("session-2", installBrowser);

		const result = await tools.browser.execute("browser-call", {
			code: "await page.goto('https://example.com'); return page.title()",
		});

		expect(installBrowser).toHaveBeenCalledOnce();
		expect(browserMock.run).toHaveBeenCalledTimes(2);
		expect(browserMock.run).toHaveBeenNthCalledWith(
			2,
			"await page.goto('https://example.com'); return page.title()",
			{ session: "session-2" },
		);
		expect(result.content[0]).toMatchObject({ type: "text" });
	});

	it("does not install the managed browser for regular page errors", async () => {
		browserMock.run.mockResolvedValueOnce({ ok: false, error: "Navigation timed out" });
		const setupBrowser = vi.fn(async () => undefined);
		const tools = createBetterWrightBrowserTools("session-5", setupBrowser);

		await tools.browser.execute("browser-call", { code: "await page.goto('https://example.com')" });

		expect(setupBrowser).not.toHaveBeenCalled();
		expect(browserMock.run).toHaveBeenCalledOnce();
	});

	it("closes the browser worker when browser_close is called", async () => {
		const tools = createBetterWrightBrowserTools("session-3");
		await tools.browser.execute("browser-call", { code: "return page.url()" });

		await tools.browserClose.execute("close-call", {});

		expect(browserMock.close).toHaveBeenCalledOnce();
	});

	it("caps browser results before they enter the model context", async () => {
		browserMock.run.mockImplementation(async () => ({ ok: true as const, result: "x".repeat(20_000) }));
		const tools = createBetterWrightBrowserTools("session-4");

		const result = await tools.browser.execute("browser-call", { code: "return document.body.innerText" });
		const content = result.content[0];

		expect(content?.type).toBe("text");
		if (content?.type !== "text") return;
		expect(content.text.length).toBeLessThanOrEqual(12_000);
		expect(content.text).toContain("Browser output truncated");
	});
});
