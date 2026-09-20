import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentToolResult } from "@eaonlabs/eaon-agent-core";
import { setKeybindings, type TUI, TuiMainScreen, type TuiMouseEvent } from "@eaonlabs/eaon-tui";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defaultEditorTheme } from "../../tui/test/test-themes.ts";
import { VirtualTerminal } from "../../tui/test/virtual-terminal.ts";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import { createSwarmSubagentTool, type SwarmToolDetails } from "../src/core/swarm.ts";
import { wrapToolDefinition } from "../src/core/tools/tool-definition-wrapper.ts";
import { CustomEditor } from "../src/modes/interactive/components/custom-editor.ts";
import { ToolExecutionComponent } from "../src/modes/interactive/components/tool-execution.ts";
import { initTheme, theme } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

const temporaryDirectories: string[] = [];

function createFakeTui(): TUI {
	return { requestRender: () => {} } as unknown as TUI;
}

async function createChildScript(source: string): Promise<{ directory: string; script: string }> {
	const directory = await mkdtemp(join(tmpdir(), "eaon-swarm-test-"));
	temporaryDirectories.push(directory);
	const script = join(directory, "child.mjs");
	await writeFile(script, source);
	return { directory, script };
}

describe("swarm sub-agent tool", () => {
	beforeAll(() => {
		initTheme("dark");
		setKeybindings(new KeybindingsManager());
	});

	afterEach(async () => {
		await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
	});

	it("streams a named sub-agent's progress before it exits", async () => {
		// Given: a child agent that reports work before completing.
		const { directory, script } = await createChildScript(`
process.stdout.write("inspecting files\\n");
setTimeout(() => {
	process.stdout.write("finished review\\n");
}, 150);
`);
		const tool = createSwarmSubagentTool({ cwd: directory, cliEntry: script });
		const agentTool = wrapToolDefinition(tool);
		const updates: AgentToolResult<SwarmToolDetails>[] = [];

		// When: the sub-agent runs and emits its first output chunk.
		let firstProgress: (() => void) | undefined;
		const progress = new Promise<void>((resolve) => {
			firstProgress = resolve;
		});
		const execution = agentTool.execute(
			"tool-stream",
			{ mode: "single", agent: "reviewer", task: "Review the changed files" },
			undefined,
			(update) => {
				updates.push(update);
				if (update.details.agents[0]?.output.includes("inspecting files")) firstProgress?.();
			},
		);
		const firstEvent = await Promise.race([progress.then(() => "progress"), execution.then(() => "completed")]);

		// Then: the parent has already received a live running update.
		expect(firstEvent).toBe("progress");
		expect(updates.some((update) => update.details.agents[0]?.output.includes("inspecting files"))).toBe(true);
		await execution;
	});

	it("keeps stderr diagnostics visible when the child also writes stdout", async () => {
		// Given: a child that reports normal progress and a diagnostic.
		const { directory, script } = await createChildScript(`
process.stdout.write("inspecting files\\n");
process.stderr.write("warning: partial result\\n");
`);
		const tool = wrapToolDefinition(createSwarmSubagentTool({ cwd: directory, cliEntry: script }));

		// When: the sub-agent completes with output on both streams.
		const result = await tool.execute(
			"tool-mixed-output",
			{ mode: "single", agent: "reviewer", task: "Review the changed files" },
			undefined,
			undefined,
		);

		// Then: neither stream hides the other in the expanded activity.
		const output = result.details.agents[0]?.output ?? "";
		expect(output).toContain("inspecting files");
		expect(output).toContain("warning: partial result");
	});

	it("bounds noisy child output before publishing live updates", async () => {
		// Given: a child that emits more output than the live activity limit.
		const { directory, script } = await createChildScript(`process.stdout.write("x".repeat(96 * 1024));`);
		const tool = wrapToolDefinition(createSwarmSubagentTool({ cwd: directory, cliEntry: script }));

		// When: the child completes.
		const result = await tool.execute(
			"tool-bounded-output",
			{ mode: "single", agent: "reviewer", task: "Produce a large report" },
			undefined,
			undefined,
		);

		// Then: the retained activity is bounded and clearly marked as truncated.
		const output = result.details.agents[0]?.output ?? "";
		expect(output).toContain("earlier sub-agent output truncated");
		expect(Buffer.byteLength(output, "utf8")).toBeLessThan(66 * 1024);
	});

	it("preserves UTF-8 characters split across process chunks", async () => {
		// Given: a child that writes one UTF-8 character across two chunks.
		const { directory, script } = await createChildScript(`
process.stdout.write(Buffer.from([0xf0, 0x9f]));
setTimeout(() => process.stdout.write(Buffer.from([0x98, 0x80])), 20);
`);
		const tool = wrapToolDefinition(createSwarmSubagentTool({ cwd: directory, cliEntry: script }));

		// When: the child completes.
		const result = await tool.execute(
			"tool-split-utf8",
			{ mode: "single", agent: "reviewer", task: "Produce unicode output" },
			undefined,
			undefined,
		);

		// Then: streaming preserves the original code point.
		expect(result.details.agents[0]?.output).toBe("😀");
	});

	it("terminates a running child when the parent turn is cancelled", async () => {
		// Given: a long-running child agent that exits cleanly on SIGTERM.
		const { directory, script } = await createChildScript(`
process.stdout.write("started\\n");
process.on("SIGTERM", () => {
	process.stdout.write("stopped\\n");
	process.exit(0);
});
setTimeout(() => process.exit(0), 1000);
`);
		const tool = createSwarmSubagentTool({ cwd: directory, cliEntry: script });
		const agentTool = wrapToolDefinition(tool);
		const controller = new AbortController();

		// When: the parent aborts while the child is running.
		const execution = agentTool.execute(
			"tool-cancel",
			{ mode: "single", agent: "tester", task: "Run the slow checks" },
			controller.signal,
			undefined,
		);
		controller.abort();
		const settledPromptly = await Promise.race([
			execution.then(() => true),
			new Promise<false>((resolve) => setTimeout(() => resolve(false), 300)),
		]);
		const result = await execution;

		// Then: cancellation settles promptly and is visible in the result details.
		expect(settledPromptly).toBe(true);
		expect(result.details.agents[0]?.status).toBe("cancelled");
	});

	it("does not mark queued work as running after cancellation", async () => {
		// Given: more tasks than the swarm concurrency limit and an already-cancelled parent.
		const { directory, script } = await createChildScript(`setTimeout(() => process.exit(0), 1000);`);
		const tool = wrapToolDefinition(createSwarmSubagentTool({ cwd: directory, cliEntry: script }));
		const controller = new AbortController();
		controller.abort();
		const observedStatuses: string[][] = [];

		// When: the cancelled parallel invocation attempts to schedule six tasks.
		const result = await tool.execute(
			"tool-cancel-queued",
			{
				mode: "parallel",
				tasks: Array.from({ length: 6 }, (_, index) => ({ agent: `agent-${index}`, task: "Wait" })),
			},
			controller.signal,
			(update) => observedStatuses.push(update.details.agents.map((agent) => agent.status)),
		);

		// Then: every task goes directly from queued to cancelled.
		expect(observedStatuses.flat()).not.toContain("running");
		expect(result.details.agents.every((agent) => agent.status === "cancelled")).toBe(true);
	});

	it("renders concise task states and a cancel hint instead of raw parameters", () => {
		// Given: a parallel swarm tool call with two named tasks.
		const tool = createSwarmSubagentTool({ cwd: process.cwd(), cliEntry: "unused.mjs" });
		const renderCall = tool.renderCall;
		if (!renderCall) throw new Error("Expected swarm call renderer");
		const args = {
			mode: "parallel" as const,
			tasks: [
				{ agent: "scout", task: "Find the relevant files" },
				{ agent: "reviewer", task: "Review the implementation" },
			],
		};

		// When: the TUI renders the in-progress tool call.
		const rendered = stripAnsi(
			renderCall(args, theme, {
				args,
				toolCallId: "tool-render",
				invalidate: () => {},
				lastComponent: undefined,
				state: {},
				cwd: process.cwd(),
				executionStarted: true,
				argsComplete: true,
				isPartial: true,
				expanded: false,
				showImages: true,
				isError: false,
			})
				.render(100)
				.join("\n"),
		);

		// Then: users see who is doing what, plus how to stop the run.
		expect(rendered).toContain("sub-agents · 2 parallel");
		expect(rendered).toContain("scout");
		expect(rendered).toContain("Find the relevant files");
		expect(rendered).toContain("escape to cancel all");
		expect(rendered).not.toContain('"mode": "parallel"');
	});

	it("removes terminal control payloads from model-generated activity", () => {
		// Given: model-generated agent and task text containing OSC and C1 control sequences.
		const tool = createSwarmSubagentTool({ cwd: process.cwd(), cliEntry: "unused.mjs" });
		const renderCall = tool.renderCall;
		if (!renderCall) throw new Error("Expected swarm call renderer");
		const args = {
			mode: "single" as const,
			agent: "\x1b]52;c;c2VjcmV0LWNsaXBib2FyZA==\u0007\u009d52;c;YzEtc2VjcmV0\u009c\u0090YzEtZGNz\u009cscout",
			task: "\u0085\u009b31mInspect files\u009b0m",
		};

		// When: the TUI renders the activity.
		const rendered = renderCall(args, theme, {
			args,
			toolCallId: "tool-safe-terminal",
			invalidate: () => {},
			lastComponent: undefined,
			state: {},
			cwd: process.cwd(),
			executionStarted: true,
			argsComplete: true,
			isPartial: true,
			expanded: false,
			showImages: true,
			isError: false,
		})
			.render(100)
			.join("\n");

		// Then: terminal instructions and their payloads never reach the rendered bytes.
		expect(rendered).not.toContain("c2VjcmV0LWNsaXBib2FyZA==");
		expect(rendered).not.toContain("YzEtc2VjcmV0");
		expect(rendered).not.toContain("YzEtZGNz");
		expect(rendered).not.toContain("52;c;");
		expect(rendered).not.toContain("\u009b31m");
		expect(rendered).not.toContain("\u009d");
		expect(rendered).not.toContain("\u0085");
		expect(stripAnsi(rendered)).toContain("scout");
		expect(stripAnsi(rendered)).toContain("Inspect files");
	});

	it("expands one clicked sub-agent or all sub-agents with Ctrl+O", () => {
		// Given: two completed sub-agents with multi-line output in a collapsed tool row.
		const tool = createSwarmSubagentTool({ cwd: process.cwd(), cliEntry: "unused.mjs" });
		const args = {
			mode: "parallel" as const,
			tasks: [
				{ agent: "scout", task: "Find the relevant files" },
				{ agent: "reviewer", task: "Review the implementation" },
			],
		};
		const component = new ToolExecutionComponent(
			"subagent",
			"tool-agent-expansion",
			args,
			{},
			tool,
			createFakeTui(),
			process.cwd(),
		);
		const keybindings = new KeybindingsManager();
		const editor = new CustomEditor(new TuiMainScreen(new VirtualTerminal()), defaultEditorTheme, keybindings);
		let toolsExpanded = false;
		editor.onAction("app.tools.expand", () => {
			toolsExpanded = !toolsExpanded;
			component.setExpanded(toolsExpanded);
		});
		component.updateResult(
			{
				content: [{ type: "text", text: "done" }],
				details: {
					mode: "parallel",
					failed: false,
					cancelled: false,
					agents: [
						{
							agent: "scout",
							task: "Find the relevant files",
							status: "completed",
							output: "scout first detail\nscout latest detail",
						},
						{
							agent: "reviewer",
							task: "Review the implementation",
							status: "completed",
							output: "review first detail\nreview latest detail",
						},
					],
				},
				isError: false,
			},
			false,
		);
		const width = 120;
		const collapsedLines = component.render(width);
		const scoutRow = collapsedLines.findIndex((line) => stripAnsi(line).includes("completed  scout"));
		expect(scoutRow).toBeGreaterThanOrEqual(0);

		// When: the user clicks the scout row.
		const event: TuiMouseEvent = {
			type: "click",
			button: "left",
			x: 4,
			y: scoutRow,
			screenX: 4,
			screenY: scoutRow,
			width,
			height: collapsedLines.length,
			shift: false,
			alt: false,
			ctrl: false,
			clickCount: 1,
		};
		expect(component.handleMouse(event)?.handled).toBe(true);

		// Then: only that sub-agent reveals its full activity.
		const clicked = stripAnsi(component.render(width).join("\n"));
		expect(clicked).toContain("scout first detail");
		expect(clicked).not.toContain("review first detail");

		// When: Ctrl+O expands the whole tool row.
		editor.handleInput("\x0f");

		// Then: every sub-agent's activity is visible.
		const expanded = stripAnsi(component.render(width).join("\n"));
		expect(expanded).toContain("scout first detail");
		expect(expanded).toContain("review first detail");

		// When: Ctrl+O collapses the whole tool row again.
		editor.handleInput("\x0f");

		// Then: global collapse clears the earlier row-level expansion too.
		const recollapsed = stripAnsi(component.render(width).join("\n"));
		expect(recollapsed).not.toContain("scout first detail");
		expect(recollapsed).not.toContain("review first detail");
	});

	it("uses the parent's current model selection for spawned agents", async () => {
		// Given: a child process that reports the CLI arguments it received.
		const { directory, script } = await createChildScript(`
process.stdout.write(JSON.stringify(process.argv.slice(2)));
`);
		const tool = wrapToolDefinition(
			createSwarmSubagentTool({
				cwd: directory,
				cliEntry: script,
				resolveModelSelection: () => ({
					provider: "openai-codex",
					model: "gpt-5.6-luna",
					thinking: "low",
				}),
			}),
		);

		// When: a sub-agent is spawned without its own model override.
		const result = await tool.execute(
			"tool-model-selection",
			{ mode: "single", agent: "scout", task: "Inspect the repository" },
			undefined,
			undefined,
		);

		// Then: the child uses the live parent provider, model, and thinking level.
		const output = result.details.agents[0]?.output ?? "";
		expect(output).toContain('"--provider","openai-codex"');
		expect(output).toContain('"--model","gpt-5.6-luna"');
		expect(output).toContain('"--thinking","low"');
	});
});
