/**
 * Swarm mode: force multi-subagent workflows (2–6 workers).
 * Toggleable via /swarm. Registers a subagent tool and injects prompt engineering.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentTool, AgentToolResult } from "@eaonlabs/eaon-agent-core";
import { Type } from "typebox";

const MAX_AGENTS = 6;
const MIN_AGENTS = 2;
const MAX_CONCURRENCY = 4;
const SUBAGENT_TIMEOUT_MS = 8 * 60 * 1000;

export const SWARM_MODE_PROMPT = `# ACTIVE MODE: SWARM (multi sub-agent)

You ARE in swarm mode right now. If the user asks "are you in swarm mode?" or "can you spawn sub agents?", answer YES — you have the \`subagent\` tool and should use it. Swarm stays on until they run /swarm again.

You are the SWARM ORCHESTRATOR. You must delegate most non-trivial work to sub-agents instead of doing it all yourself.

## Rules (follow strictly)
1. For any multi-file or multi-step task, spawn **2 to 6** sub-agents via the \`subagent\` tool. Never do a large task solo when you can split it.
2. Split by **role**, not by "do the whole thing":
   - scout: locate files, APIs, and call sites (read-only)
   - implementer: write or edit a focused set of files
   - tester: run tests/linters and report failures
   - reviewer: check the diff against the request and list gaps
3. Prefer **parallel** mode for independent work. Use **chain** when step N depends on N-1.
4. Each sub-agent task must be **self-contained**: include paths, success criteria, and constraints. Do not assume the sub-agent saw the chat.
5. After 2–4 parallel agents finish, integrate results yourself (or spawn one more implementer). Do not spawn more than **6** agents for one request.
6. Still use your own tools for tiny one-liners (single file read, one grep). Swarm is for real work.
7. Always end with a short synthesis: what each agent did, what changed, what remains.

## Sub-agent task template
\`\`\`
Role: <scout|implementer|tester|reviewer|custom>
Goal: <one sentence>
Context: <repo cwd, key files>
Success criteria: <bullets>
Constraints: <do not touch X; keep style Y>
Deliverable: <summary + file list>
\`\`\`

If the user asked for something small (single file tweak), say so and use 0–1 sub-agents — do not pad with fake agents.`;

export interface SwarmTask {
	agent: string;
	task: string;
	model?: string;
}

export interface SwarmSubagentOptions {
	cwd: string;
	model?: string;
	provider?: string;
	thinking?: string;
	/** Absolute path to the CLI entry (tsx + src, or dist bundle). */
	cliEntry: string;
	tsconfigPath?: string;
	tsxBin?: string;
	env?: NodeJS.ProcessEnv;
}

function resolveCliInvocation(opts: SwarmSubagentOptions): { command: string; argsPrefix: string[] } {
	// Prefer tsx when running from source (cliEntry ends in .ts)
	if (opts.cliEntry.endsWith(".ts") && opts.tsxBin) {
		return {
			command: opts.tsxBin,
			argsPrefix: opts.tsconfigPath ? ["--tsconfig", opts.tsconfigPath, opts.cliEntry] : [opts.cliEntry],
		};
	}
	return { command: process.execPath, argsPrefix: [opts.cliEntry] };
}

async function runOneSubagent(
	prompt: string,
	opts: SwarmSubagentOptions,
): Promise<{ output: string; exitCode: number; stderr: string }> {
	const { command, argsPrefix } = resolveCliInvocation(opts);
	const args = [
		...argsPrefix,
		"--mode",
		"text",
		"--print",
		"--no-session",
		"--no-tools",
		"--tools",
		"read,bash,grep,find,ls",
		"--no-extensions",
		"--no-skills",
	];
	if (opts.provider) args.push("--provider", opts.provider);
	if (opts.model) args.push("--model", opts.model);
	if (opts.thinking) args.push("--thinking", opts.thinking);
	args.push(prompt);

	return new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env, PI_OFFLINE: "0" },
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			stderr += "\n[subagent timed out]";
		}, SUBAGENT_TIMEOUT_MS);
		child.stdout.on("data", (d) => {
			stdout += String(d);
		});
		child.stderr.on("data", (d) => {
			stderr += String(d);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ output: stdout, exitCode: code ?? 1, stderr });
		});
		child.on("error", (err) => {
			clearTimeout(timer);
			resolve({ output: "", exitCode: 1, stderr: String(err) });
		});
	});
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			results[i] = await fn(items[i], i);
		}
	});
	await Promise.all(workers);
	return results;
}

export function createSwarmSubagentTool(opts: SwarmSubagentOptions): AgentTool {
	return {
		name: "subagent",
		label: "subagent",
		description:
			"Spawn 2–6 specialized sub-agents (scout, implementer, tester, reviewer). Use parallel for independent work; chain for dependent steps. Each task must be self-contained.",
		parameters: Type.Union([
			Type.Object({
				mode: Type.Literal("single"),
				agent: Type.String({ description: "Role name: scout | implementer | tester | reviewer | custom" }),
				task: Type.String({ description: "Self-contained task brief" }),
				model: Type.Optional(Type.String()),
			}),
			Type.Object({
				mode: Type.Literal("parallel"),
				tasks: Type.Array(
					Type.Object({
						agent: Type.String(),
						task: Type.String(),
						model: Type.Optional(Type.String()),
					}),
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
		]),
		async execute(_toolCallId: string, params: unknown, signal?: AbortSignal): Promise<AgentToolResult<unknown>> {
			const p = params as
				| { mode: "single"; agent: string; task: string; model?: string }
				| { mode: "parallel"; tasks: SwarmTask[] }
				| { mode: "chain"; chain: SwarmTask[] };

			const tag = (t: SwarmTask) =>
				`### Sub-agent: ${t.agent}\n\nYou are a ${t.agent} sub-agent for Eaon Code. Work only on the task below. Use read/bash/grep/find/ls. Do not ask the user questions. Reply with a concise result.\n\n${t.task}\n`;

			try {
				if (signal?.aborted) {
					throw new Error("Subagent cancelled.");
				}

				if (p.mode === "single") {
					const one = { agent: p.agent, task: p.task };
					const r = await runOneSubagent(tag(one), {
						...opts,
						model: p.model ?? opts.model,
					});
					const text = `## ${p.agent}\n\n${r.output || r.stderr || "(no output)"}`;
					return {
						content: [{ type: "text", text }],
						details: { exitCode: r.exitCode, mode: "single", agents: [p.agent] },
					};
				}

				if (p.mode === "parallel") {
					const tasks = p.tasks.slice(0, MAX_AGENTS);
					const results = await mapLimit(tasks, MAX_CONCURRENCY, async (t, i) => {
						const r = await runOneSubagent(tag(t), { ...opts, model: t.model ?? opts.model });
						return { t, r, i };
					});
					const parts = results.map(({ t, r }) => `## ${t.agent}\n\n${r.output || r.stderr || "(no output)"}`);
					const failed = results.some((x) => x.r.exitCode !== 0);
					return {
						content: [{ type: "text", text: parts.join("\n\n---\n\n") }],
						details: {
							mode: "parallel",
							agents: tasks.map((t) => t.agent),
							exitCodes: results.map((x) => x.r.exitCode),
							failed,
						},
					};
				}

				// chain
				const chain = p.chain.slice(0, MAX_AGENTS);
				let previous = "";
				const parts: string[] = [];
				let failed = false;
				for (const step of chain) {
					if (signal?.aborted) {
						failed = true;
						parts.push(`## ${step.agent}\n\n[cancelled]`);
						break;
					}
					const task = step.task.replaceAll("{previous}", previous.slice(0, 12_000));
					const r = await runOneSubagent(tag({ agent: step.agent, task }), {
						...opts,
						model: step.model ?? opts.model,
					});
					previous = r.output || r.stderr || "";
					if (r.exitCode !== 0) failed = true;
					parts.push(`## ${step.agent}\n\n${previous || "(no output)"}`);
				}
				return {
					content: [{ type: "text", text: parts.join("\n\n---\n\n") }],
					details: { mode: "chain", agents: chain.map((s) => s.agent), failed },
				};
			} catch (error) {
				throw new Error(`Swarm error: ${error instanceof Error ? error.message : String(error)}`);
			}
		},
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
