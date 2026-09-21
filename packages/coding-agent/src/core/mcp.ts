/**
 * Optional MCP (Model Context Protocol) client.
 * No servers ship by default. Users opt in via settings.json or /mcp add.
 *
 * Settings shape:
 *   "mcpServers": {
 *     "filesystem": {
 *       "command": "npx",
 *       "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
 *       "env": { "FOO": "bar" }
 *     }
 *   }
 */

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { VERSION } from "../config.ts";

export interface McpServerConfig {
	command: string;
	args?: string[];
	env?: Record<string, string>;
	enabled?: boolean;
}

export type McpServersConfig = Record<string, McpServerConfig>;

export interface McpToolInfo {
	server: string;
	name: string;
	description?: string;
	inputSchema?: unknown;
}

interface JsonRpcMessage {
	jsonrpc: "2.0";
	id?: number | string;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: { code: number; message: string; data?: unknown };
}

export class McpClient {
	#serverName: string;
	#config: McpServerConfig;
	#child?: ChildProcessWithoutNullStreams;
	#nextId = 1;
	#pending = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
	#buffer = "";
	#tools: McpToolInfo[] = [];
	#connected = false;

	constructor(serverName: string, config: McpServerConfig) {
		this.#serverName = serverName;
		this.#config = config;
	}

	get name(): string {
		return this.#serverName;
	}

	get connected(): boolean {
		return this.#connected;
	}

	get tools(): McpToolInfo[] {
		return this.#tools;
	}

	async connect(): Promise<void> {
		if (this.#connected) return;
		const { command, args = [], env } = this.#config;
		this.#child = spawn(command, args, {
			env: { ...process.env, ...env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		this.#child.stdout.on("data", (chunk: Buffer) => this.#onData(chunk.toString("utf8")));
		this.#child.stderr.on("data", () => {
			/* ignore server logs for now */
		});
		this.#child.on("exit", () => {
			this.#connected = false;
			for (const [, p] of this.#pending) p.reject(new Error(`MCP server ${this.#serverName} exited`));
			this.#pending.clear();
		});

		await this.#request("initialize", {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: { name: "eaon-code", version: VERSION },
		});
		// notification
		this.#notify("notifications/initialized", {});
		const toolsResult = (await this.#request("tools/list", {})) as { tools?: Array<Record<string, unknown>> };
		this.#tools = (toolsResult.tools ?? []).map((t) => ({
			server: this.#serverName,
			name: String(t.name ?? ""),
			description: t.description ? String(t.description) : undefined,
			inputSchema: t.inputSchema,
		}));
		this.#connected = true;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<string> {
		const result = (await this.#request("tools/call", { name, arguments: args })) as {
			content?: Array<{ type?: string; text?: string }>;
			isError?: boolean;
		};
		const text = (result.content ?? [])
			.filter((c) => c.type === "text" && typeof c.text === "string")
			.map((c) => c.text)
			.join("\n");
		if (result.isError) throw new Error(text || `MCP tool ${name} failed`);
		return text || "(empty result)";
	}

	async close(): Promise<void> {
		this.#connected = false;
		this.#child?.kill("SIGTERM");
		this.#child = undefined;
		this.#pending.clear();
	}

	#notify(method: string, params: unknown): void {
		this.#write({ jsonrpc: "2.0", method, params });
	}

	#request(method: string, params: unknown): Promise<unknown> {
		const id = this.#nextId++;
		return new Promise((resolve, reject) => {
			this.#pending.set(id, { resolve, reject });
			this.#write({ jsonrpc: "2.0", id, method, params });
			setTimeout(() => {
				if (this.#pending.has(id)) {
					this.#pending.delete(id);
					reject(new Error(`MCP ${this.#serverName} ${method} timed out`));
				}
			}, 30_000);
		});
	}

	#write(msg: JsonRpcMessage): void {
		this.#child?.stdin.write(`${JSON.stringify(msg)}\n`);
	}

	#onData(chunk: string): void {
		this.#buffer += chunk;
		while (true) {
			const nl = this.#buffer.indexOf("\n");
			if (nl === -1) break;
			const line = this.#buffer.slice(0, nl).trim();
			this.#buffer = this.#buffer.slice(nl + 1);
			if (!line) continue;
			let msg: JsonRpcMessage;
			try {
				msg = JSON.parse(line) as JsonRpcMessage;
			} catch {
				continue;
			}
			if (msg.id !== undefined && this.#pending.has(msg.id)) {
				const pending = this.#pending.get(msg.id)!;
				this.#pending.delete(msg.id);
				if (msg.error) pending.reject(new Error(msg.error.message));
				else pending.resolve(msg.result);
			}
		}
	}
}

export function mcpToolName(server: string, tool: string): string {
	return `mcp__${server}__${tool}`.replace(/[^\w.-]+/g, "_");
}

export function formatMcpStatus(servers: McpServersConfig, connected: string[]): string {
	const names = Object.keys(servers);
	if (names.length === 0) return "mcp: none (opt-in via /mcp add)";
	return `mcp: ${connected.length}/${names.length} connected`;
}
