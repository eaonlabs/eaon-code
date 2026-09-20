import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import {
	killProcessTree,
	sanitizeBinaryOutput,
	trackDetachedChildPid,
	untrackDetachedChildPid,
} from "../utils/shell.ts";
import type { SwarmSubagentOptions } from "./swarm.ts";
import { truncateTail } from "./tools/truncate.ts";

const SUBAGENT_TIMEOUT_MS = 8 * 60 * 1000;
const LIVE_UPDATE_INTERVAL_MS = 50;
const MAX_STREAM_OUTPUT_BYTES = 32 * 1024;
const MAX_STREAM_OUTPUT_LINES = 500;
const TRUNCATION_NOTICE = "[... earlier sub-agent output truncated ...]\n";

export type SwarmProcessStatus = "completed" | "failed" | "cancelled" | "timed_out";

export interface SwarmProcessResult {
	readonly output: string;
	readonly stderr: string;
	readonly exitCode: number;
	readonly status: SwarmProcessStatus;
}

export type SwarmProcessUpdate = (output: string, stderr: string) => void;

function appendOutput(current: string, chunk: string): { text: string; truncated: boolean } {
	const combined = current + sanitizeBinaryOutput(chunk);
	const truncated = truncateTail(combined, {
		maxBytes: MAX_STREAM_OUTPUT_BYTES,
		maxLines: MAX_STREAM_OUTPUT_LINES,
	});
	return { text: truncated.content, truncated: truncated.truncated };
}

function visibleOutput(output: string, truncated: boolean): string {
	return truncated ? `${TRUNCATION_NOTICE}${output}` : output;
}

function resolveCliInvocation(opts: SwarmSubagentOptions): { command: string; argsPrefix: string[] } {
	if (opts.cliEntry.endsWith(".ts") && opts.tsxBin) {
		return {
			command: opts.tsxBin,
			argsPrefix: opts.tsconfigPath ? ["--tsconfig", opts.tsconfigPath, opts.cliEntry] : [opts.cliEntry],
		};
	}
	return { command: process.execPath, argsPrefix: [opts.cliEntry] };
}

export async function runSwarmSubagent(
	prompt: string,
	opts: SwarmSubagentOptions,
	signal: AbortSignal | undefined,
	onUpdate: SwarmProcessUpdate,
): Promise<SwarmProcessResult> {
	if (signal?.aborted) {
		return { output: "", stderr: "", exitCode: 1, status: "cancelled" };
	}

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
			detached: process.platform !== "win32",
			env: { ...process.env, ...opts.env, PI_OFFLINE: "0" },
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});
		if (child.pid) trackDetachedChildPid(child.pid);
		let stdout = "";
		let stderr = "";
		const stdoutDecoder = new StringDecoder("utf8");
		const stderrDecoder = new StringDecoder("utf8");
		let stdoutTruncated = false;
		let stderrTruncated = false;
		let decodersFlushed = false;
		let requestedStatus: "cancelled" | "timed_out" | undefined;
		let settled = false;
		let updateTimer: NodeJS.Timeout | undefined;

		const emitUpdate = () => {
			updateTimer = undefined;
			onUpdate(visibleOutput(stdout, stdoutTruncated), visibleOutput(stderr, stderrTruncated));
		};
		const scheduleUpdate = () => {
			updateTimer ??= setTimeout(emitUpdate, LIVE_UPDATE_INTERVAL_MS);
		};
		const appendStdout = (chunk: string) => {
			const next = appendOutput(stdout, chunk);
			stdout = next.text;
			stdoutTruncated ||= next.truncated;
		};
		const appendStderr = (chunk: string) => {
			const next = appendOutput(stderr, chunk);
			stderr = next.text;
			stderrTruncated ||= next.truncated;
		};
		const flushDecoders = () => {
			if (decodersFlushed) return;
			decodersFlushed = true;
			appendStdout(stdoutDecoder.end());
			appendStderr(stderrDecoder.end());
		};

		const stopChild = (status: "cancelled" | "timed_out") => {
			requestedStatus ??= status;
			if (child.pid) killProcessTree(child.pid);
		};
		const onAbort = () => stopChild("cancelled");
		const timer = setTimeout(() => {
			appendStderr("\n[sub-agent timed out]");
			stopChild("timed_out");
		}, SUBAGENT_TIMEOUT_MS);
		const finish = (exitCode: number, status: SwarmProcessStatus) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (updateTimer) clearTimeout(updateTimer);
			signal?.removeEventListener("abort", onAbort);
			if (child.pid) untrackDetachedChildPid(child.pid);
			resolve({
				output: visibleOutput(stdout, stdoutTruncated),
				stderr: visibleOutput(stderr, stderrTruncated),
				exitCode,
				status,
			});
		};

		child.stdout.on("data", (data: Buffer) => {
			appendStdout(stdoutDecoder.write(data));
			scheduleUpdate();
		});
		child.stderr.on("data", (data: Buffer) => {
			appendStderr(stderrDecoder.write(data));
			scheduleUpdate();
		});
		child.on("close", (code) => {
			flushDecoders();
			const exitCode = code ?? 1;
			finish(exitCode, requestedStatus ?? (exitCode === 0 ? "completed" : "failed"));
		});
		child.on("error", (error) => {
			flushDecoders();
			appendStderr(`${stderr ? "\n" : ""}${error.message}`);
			finish(1, requestedStatus ?? "failed");
		});

		if (signal) signal.addEventListener("abort", onAbort, { once: true });
	});
}

export async function mapSwarmTasks<T, R>(
	items: readonly T[],
	limit: number,
	run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
		while (true) {
			const index = next++;
			const item = items[index];
			if (item === undefined) return;
			results[index] = await run(item, index);
		}
	});
	await Promise.all(workers);
	return results;
}
