import { Container, MouseRegion, Text, truncateToWidth } from "@eaonlabs/eaon-tui";
import { keyText } from "../modes/interactive/components/keybinding-hints.ts";
import type { Theme } from "../modes/interactive/theme/theme.ts";
import type { ToolDefinition, ToolRenderResultOptions } from "./extensions/types.ts";
import type { SwarmInvocation, SwarmParamsSchema, SwarmTask, SwarmToolDetails } from "./swarm.ts";

const COLLAPSED_OUTPUT_LINES = 1;

export interface SwarmRendererState {
	expandedAgents?: Set<number>;
	wasGloballyExpanded?: boolean;
}

function taskPreview(task: string): string {
	const normalized = task.replaceAll(/\s+/g, " ").trim();
	return truncateToWidth(normalized, 64, "...");
}

function listTasks(args: SwarmInvocation): readonly SwarmTask[] {
	switch (args.mode) {
		case "single":
			return [{ agent: args.agent, task: args.task, model: args.model }];
		case "parallel":
			return args.tasks;
		case "chain":
			return args.chain;
	}
}

function formatCall(args: SwarmInvocation, theme: Theme, executionStarted: boolean, isPartial: boolean): string {
	const tasks = listTasks(args);
	let text = theme.fg("toolTitle", theme.bold(`sub-agents · ${tasks.length} ${args.mode}`));
	for (const task of tasks) {
		text += `\n  ${theme.fg("accent", task.agent)}  ${theme.fg("muted", taskPreview(task.task))}`;
	}
	if (executionStarted && isPartial) {
		text += `\n  ${theme.fg("dim", `${keyText("app.interrupt")} to cancel all`)}`;
	}
	return text;
}

function statusLabel(status: SwarmToolDetails["agents"][number]["status"], theme: Theme): string {
	switch (status) {
		case "queued":
			return theme.fg("muted", "○ queued");
		case "running":
			return theme.fg("accent", "● running");
		case "completed":
			return theme.fg("success", "✓ completed");
		case "failed":
			return theme.fg("error", "× failed");
		case "cancelled":
			return theme.fg("warning", "■ cancelled");
		case "timed_out":
			return theme.fg("error", "! timed out");
	}
}

function formatAgent(agent: SwarmToolDetails["agents"][number], expanded: boolean, theme: Theme): string {
	let text = `${statusLabel(agent.status, theme)}  ${theme.fg("toolTitle", theme.bold(agent.agent))}`;
	if (expanded) text += `\n    ${theme.fg("muted", taskPreview(agent.task))}`;
	const output = agent.output.trim();
	if (!output) return text;
	const lines = output.split("\n");
	const visibleLines = expanded ? lines : lines.slice(-COLLAPSED_OUTPUT_LINES);
	if (lines.length > visibleLines.length) {
		text += `\n    ${theme.fg("dim", `... ${lines.length - visibleLines.length} earlier lines`)}`;
	}
	text += `\n${visibleLines.map((outputLine) => `    ${theme.fg("toolOutput", outputLine)}`).join("\n")}`;
	if (!expanded) text += `\n    ${theme.fg("dim", `click or ${keyText("app.tools.expand")} to expand`)}`;
	return text;
}

function renderAgents(
	details: SwarmToolDetails,
	options: ToolRenderResultOptions,
	theme: Theme,
	state: SwarmRendererState,
	invalidate: () => void,
): Container {
	const container = new Container();
	state.expandedAgents ??= new Set();
	if (state.wasGloballyExpanded && !options.expanded) state.expandedAgents.clear();
	state.wasGloballyExpanded = options.expanded;
	for (const [index, agent] of details.agents.entries()) {
		const expanded = options.expanded || state.expandedAgents.has(index);
		const text = new Text(formatAgent(agent, expanded, theme), 0, 0);
		container.addChild(
			new MouseRegion(text, (event) => {
				if (event.type !== "click" || event.button !== "left") return undefined;
				if (state.expandedAgents?.has(index)) state.expandedAgents.delete(index);
				else state.expandedAgents?.add(index);
				invalidate();
				return { handled: true };
			}),
		);
	}
	return container;
}

export const swarmRenderers: Pick<
	ToolDefinition<SwarmParamsSchema, SwarmToolDetails, SwarmRendererState>,
	"renderCall" | "renderResult"
> = {
	renderCall(args, theme, context) {
		const text = context.lastComponent instanceof Text ? context.lastComponent : new Text("", 0, 0);
		text.setText(formatCall(args, theme, context.executionStarted, context.isPartial));
		return text;
	},
	renderResult(result, options, theme, context) {
		const details = result.details;
		return details ? renderAgents(details, options, theme, context.state, context.invalidate) : new Text("", 0, 0);
	},
};
