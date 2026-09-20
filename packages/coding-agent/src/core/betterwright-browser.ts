import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { AgentTool, AgentToolResult } from "@eaonlabs/eaon-agent-core";
import type { BetterWright, RunResult } from "betterwright/sdk";
import { type Static, Type } from "typebox";

const MAX_BROWSER_RESULT_CHARS = 12_000;
const TRUNCATION_NOTICE = "\n[Browser output truncated; use a focused snapshot or diff.]";
const MISSING_MANAGED_BROWSER_ERROR =
	"Managed BetterChromium is outdated or its verified installation receipt is missing";
const MAX_SETUP_OUTPUT_CHARS = 4_000;
const browserSchema = Type.Object({
	code: Type.String({
		maxLength: 20_000,
		description: "Async Playwright JavaScript; use return to expose only the useful result.",
	}),
});
const browserCloseSchema = Type.Object({});
type BrowserInput = Static<typeof browserSchema>;
type BrowserSetup = () => Promise<void>;

let browserSetup: Promise<void> | undefined;

function appendOutputTail(output: string, chunk: string): string {
	return `${output}${chunk}`.slice(-MAX_SETUP_OUTPUT_CHARS);
}

function runBetterWrightSetup(): Promise<void> {
	const packageJsonUrl = import.meta.resolve("betterwright/package.json");
	const cliPath = fileURLToPath(new URL("./dist/bin/betterwright.js", packageJsonUrl));

	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath, "setup"], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let output = "";
		child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
			output = appendOutputTail(output, chunk);
		});
		child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
			output = appendOutputTail(output, chunk);
		});
		child.once("error", reject);
		child.once("close", (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			const status = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
			reject(new Error(`betterwright setup failed (${status})${output ? `\n${output}` : ""}`));
		});
	});
}

function ensureManagedBrowser(): Promise<void> {
	if (!browserSetup) {
		browserSetup = runBetterWrightSetup().catch((error: unknown) => {
			browserSetup = undefined;
			throw error;
		});
	}
	return browserSetup;
}

type BetterWrightBrowserTools = {
	readonly browser: AgentTool<typeof browserSchema, undefined>;
	readonly browserClose: AgentTool<typeof browserCloseSchema, undefined>;
	readonly close: () => Promise<boolean>;
};

export function createBetterWrightBrowserTools(
	sessionId: string,
	setupBrowser: BrowserSetup = ensureManagedBrowser,
): BetterWrightBrowserTools {
	let browser: Promise<BetterWright> | undefined;
	let queue = Promise.resolve();

	function serialize<T>(operation: () => Promise<T>): Promise<T> {
		const result = queue.then(operation);
		queue = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	function getBrowser(): Promise<BetterWright> {
		if (!browser) {
			browser = import("betterwright/sdk")
				.then(({ BetterWright }) => new BetterWright())
				.catch((error: unknown) => {
					browser = undefined;
					throw error;
				});
		}
		return browser;
	}

	async function closeBrowser(): Promise<boolean> {
		const current = browser;
		if (!current) return false;
		browser = undefined;
		await (await current).close();
		return true;
	}

	const close = (): Promise<boolean> => serialize(closeBrowser);

	const browserTool: AgentTool<typeof browserSchema, undefined> = {
		name: "browser",
		label: "browser",
		description:
			"Run Playwright JavaScript in BetterWright's persistent, network-guarded browser. Globals include page, pages, snapshot, screenshot, and human. Prefer focused snapshots/diffs; call browser_close when finished.",
		parameters: browserSchema,
		async execute(_id: string, { code }: BrowserInput): Promise<AgentToolResult<undefined>> {
			return serialize(async () => {
				let result: RunResult = await (await getBrowser()).run(code, { session: sessionId });
				if (!result.ok && result.error.includes(MISSING_MANAGED_BROWSER_ERROR)) {
					const browserError = result.error;
					await closeBrowser();
					try {
						await setupBrowser();
					} catch (error: unknown) {
						const setupError = error instanceof Error ? error.message : String(error);
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify({
										ok: false,
										error: `Automatic BetterChromium setup failed: ${setupError}`,
										browserError,
									}),
								},
							],
							details: undefined,
						};
					}
					result = await (await getBrowser()).run(code, { session: sessionId });
				}
				const serialized = JSON.stringify(result, null, 2) ?? "null";
				const text =
					serialized.length > MAX_BROWSER_RESULT_CHARS
						? `${serialized.slice(0, MAX_BROWSER_RESULT_CHARS - TRUNCATION_NOTICE.length)}${TRUNCATION_NOTICE}`
						: serialized;
				return { content: [{ type: "text", text }], details: undefined };
			});
		},
	};

	const browserCloseTool: AgentTool<typeof browserCloseSchema, undefined> = {
		name: "browser_close",
		label: "browser_close",
		description: "Close the BetterWright browser and release its worker when browser work is finished.",
		parameters: browserCloseSchema,
		async execute(): Promise<AgentToolResult<undefined>> {
			const wasOpen = await close();
			return {
				content: [{ type: "text", text: wasOpen ? "BetterWright browser closed." : "No browser session is open." }],
				details: undefined,
			};
		},
	};

	return { browser: browserTool, browserClose: browserCloseTool, close };
}
