/**
 * Swarm mode: force multi-subagent workflows (2–6 workers).
 * Toggleable via /swarm. Registers a subagent tool and injects prompt engineering.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Type } from "typebox";
import type { ToolDefinition } from "./extensions/types.ts";
import { mapSwarmTasks, runSwarmSubagent } from "./swarm-process.ts";
import { swarmRenderers } from "./swarm-renderers.ts";

export { SWARM_MODE_PROMPT } from "./swarm-prompt.ts";

const MAX_AGENTS = 6;
const MIN_AGENTS = 2;
const MAX_CONCURRENCY = 4;

export interface SwarmTask {
	readonly agent: string;
	readonly task: string;
	readonly model?: string;
}

export interface SwarmSubagentOptions {
	readonly cwd: string;
	readonly model?: string;
	readonly provider?: string;
	readonly thinking?: string;
	/** Absolute path to the CLI entry (tsx + src, or dist bundle). */
	readonly cliEntry: string;
	readonly tsconfigPath?: string;
	readonly tsxBin?: string;
	readonly env?: NodeJS.ProcessEnv;
	readonly resolveModelSelection?: () => {
		readonly model?: string;
		readonly provider?: string;
		readonly thinking?: string;
	};
}

export type SwarmAgentStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";

export interface SwarmAgentDetails {
	readonly agent: string;
	readonly task: string;
	readonly status: SwarmAgentStatus;
	readonly output: string;
	readonly exitCode?: number;
}

export interface SwarmToolDetails {
	readonly mode: "single" | "parallel" | "chain";
	readonly agents: readonly SwarmAgentDetails[];
	readonly failed: boolean;
	readonly cancelled: boolean;
}

const SwarmParams = Type.Union([
	Type.Object({
		mode: Type.Literal("single"),
		agent: Type.String({ description: "Role name: scout | implementer | tester | reviewer | custom" }),
		task: Type.String({ description: "Self-contained task brief" }),
		model: Type.Optional(Type.String()),
	}),
	Type.Object({
		mode: Type.Literal("parallel"),
		tasks: Type.Array(
			Type.Object({ agent: Type.String(), task: Type.String(), model: Type.Optional(Type.String()) }),
			{ minItems: 1, maxItems: MAX_AGENTS },
		),
	}),
	Type.Object({
		mode: Type.Literal("chain"),
		chain: Type.Array(
			Type.Object({
				agent: Type.String(),
				task: Type.String({ description: "May reference {previous} for the prior step output" }),
				model: Type.Optional(Type.String()),
			}),
			{ minItems: 1, maxItems: MAX_AGENTS },
		),
	}),
]);
export type SwarmParamsSchema = typeof SwarmParams;

export type SwarmInvocation =
	| { readonly mode: "single"; readonly agent: string; readonly task: string; readonly model?: string }
	| { readonly mode: "parallel"; readonly tasks: readonly SwarmTask[] }
	| { readonly mode: "chain"; readonly chain: readonly SwarmTask[] };

export function listSwarmTasks(params: SwarmInvocation): readonly SwarmTask[] {
	switch (params.mode) {
		case "single":
			return [{ agent: params.agent, task: params.task, model: params.model }];
		case "parallel":
			return params.tasks.slice(0, MAX_AGENTS);
		case "chain":
			return params.chain.slice(0, MAX_AGENTS);
	}
}

function displayOutput(output: string, stderr: string): string {
	if (!output) return stderr;
	if (!stderr) return output;
	return `${output.trimEnd()}\n${stderr.trimStart()}`;
}

function summarize(details: SwarmToolDetails): string {
	const done = details.agents.filter((agent) => agent.status !== "queued" && agent.status !== "running").length;
	const running = details.agents.filter((agent) => agent.status === "running").length;
	return `Sub-agents: ${done}/${details.agents.length} finished, ${running} running`;
}

export function createSwarmSubagentTool(
	opts: SwarmSubagentOptions,
): ToolDefinition<typeof SwarmParams, SwarmToolDetails> {
	return {
		name: "subagent",
		label: "subagent",
		description:
			"Spawn 2–6 specialized sub-agents (scout, implementer, tester, reviewer). Use parallel for independent work; chain for dependent steps. Each task must be self-contained.",
		parameters: SwarmParams,
		async execute(_toolCallId, params, signal, onUpdate) {
			const mode = params.mode;
			const tasks = listSwarmTasks(params);
			const agents: SwarmAgentDetails[] = tasks.map((task) => ({
				agent: task.agent,
				task: task.task,
				status: "queued",
				output: "",
			}));
			const tag = (t: SwarmTask) =>
				`### Sub-agent: ${t.agent}\n\nYou are a ${t.agent} sub-agent for Eaon Code. Work only on the task below. Use read/bash/grep/find/ls. Do not ask the user questions. Reply with a concise result.\n\n${t.task}\n`;
			const getDetails = (): SwarmToolDetails => ({
				mode,
				agents: [...agents],
				failed: agents.some((agent) => agent.status === "failed" || agent.status === "timed_out"),
				cancelled: agents.some((agent) => agent.status === "cancelled"),
			});
			const emitUpdate = () => {
				if (!onUpdate) return;
				const details = getDetails();
				onUpdate({ content: [{ type: "text", text: summarize(details) }], details });
			};
			const runTask = async (task: SwarmTask, index: number, prompt: string) => {
				if (signal?.aborted) {
					agents[index] = { ...agents[index], status: "cancelled" };
					emitUpdate();
					return { output: "", stderr: "", exitCode: 1, status: "cancelled" as const };
				}
				agents[index] = { ...agents[index], status: "running" };
				emitUpdate();
				const selection = opts.resolveModelSelection?.() ?? {};
				const result = await runSwarmSubagent(
					tag({ ...task, task: prompt }),
					{ ...opts, ...selection, model: task.model ?? selection.model ?? opts.model },
					signal,
					(output, stderr) => {
						agents[index] = { ...agents[index], output: displayOutput(output, stderr) };
						emitUpdate();
					},
				);
				agents[index] = {
					...agents[index],
					status: result.status,
					output: displayOutput(result.output, result.stderr),
					exitCode: result.exitCode,
				};
				emitUpdate();
				return result;
			};

			if (mode === "parallel") {
				await mapSwarmTasks(tasks, MAX_CONCURRENCY, (task, index) => runTask(task, index, task.task));
			} else if (mode === "chain") {
				let previous = "";
				for (let index = 0; index < tasks.length; index++) {
					const task = tasks[index];
					if (!task) continue;
					if (signal?.aborted) {
						for (let remaining = index; remaining < agents.length; remaining++) {
							agents[remaining] = { ...agents[remaining], status: "cancelled" };
						}
						break;
					}
					const prompt = task.task.replaceAll("{previous}", previous.slice(0, 12_000));
					const result = await runTask(task, index, prompt);
					previous = displayOutput(result.output, result.stderr);
				}
			} else {
				const task = tasks[0];
				if (task) await runTask(task, 0, task.task);
			}

			const details = getDetails();
			const text = details.agents
				.map((agent) => `## ${agent.agent}\n\n${agent.output || `[${agent.status}]`}`)
				.join("\n\n---\n\n");
			return { content: [{ type: "text", text }], details };
		},
		...swarmRenderers,
	};
}

function resolveMonorepoRoot(): string {
	// packages/coding-agent/src/core/swarm.ts → monorepo root
	const here = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(here, "../../../..");
}

function firstExisting(...candidates: string[]): string | undefined {
	for (const c of candidates) {
		try {
			if (fs.existsSync(c)) return c;
		} catch {
			/* ignore */
		}
	}
	return undefined;
}

export function defaultSwarmCliOptions(repoRoot?: string): SwarmSubagentOptions {
	const root = repoRoot ?? resolveMonorepoRoot();
	const packageRoot = path.join(root, "packages/coding-agent");
	const tsxBin =
		firstExisting(path.join(root, "node_modules/.bin/tsx"), path.join(packageRoot, "node_modules/.bin/tsx")) ?? "tsx";
	const cliTs = path.join(packageRoot, "src/experimental/cli.ts");
	const cliJs = path.join(packageRoot, "dist/bundle/cli.js");
	const useSource = fs.existsSync(cliTs) && tsxBin !== "tsx" ? true : fs.existsSync(cliTs);
	const cliEntry = useSource ? cliTs : cliJs;
	return {
		cwd: process.cwd(),
		cliEntry,
		tsconfigPath: path.join(root, "tsconfig.json"),
		tsxBin,
	};
}

export function formatSwarmStatus(enabled: boolean): string {
	if (!enabled) return "swarm off";
	return `swarm · ${MIN_AGENTS}–${MAX_AGENTS} sub-agents`;
}
