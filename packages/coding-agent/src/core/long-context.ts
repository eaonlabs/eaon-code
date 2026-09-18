/**
 * Built-in long-session context tools (Eaon "billion context" lite).
 * Not a full ACP proxy — in-process compress/status tools that fold old
 * turns into summaries so sessions can run much longer.
 */

import type { AgentTool, AgentToolResult } from "@eaonlabs/eaon-agent-core";
import { Type } from "typebox";

export interface CompressTarget {
	getMessages(): Array<{ role: string; content?: unknown }>;
	/** Replace message history (used after folding). */
	setMessages(messages: unknown[]): void;
}

const KEEP_TAIL = 8;

function messageText(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				if (block && typeof block === "object" && "type" in block) {
					const b = block as { type: string; text?: string; content?: unknown };
					if (b.type === "text" && typeof b.text === "string") return b.text;
					if (b.type === "toolResult") return messageText(b.content);
				}
				return "";
			})
			.filter(Boolean)
			.join("\n");
	}
	return "";
}

export function createCompressTool(getTarget: () => CompressTarget | undefined): AgentTool {
	return {
		name: "compress",
		label: "compress",
		description:
			"Fold older conversation turns into a compact summary block so long sessions stay under the context window. Keeps the most recent turns intact.",
		parameters: Type.Object({
			reason: Type.Optional(Type.String({ description: "Why compress now (e.g. context is near limit)" })),
			keepTail: Type.Optional(Type.Number({ minimum: 2, maximum: 40, default: KEEP_TAIL })),
		}),
		async execute(_id: string, params: unknown): Promise<AgentToolResult<undefined>> {
			const p = params as { reason?: string; keepTail?: number };
			const target = getTarget();
			if (!target) {
				throw new Error("compress: no session target");
			}
			const messages = target.getMessages();
			const keep = Math.max(2, Math.min(40, p.keepTail ?? KEEP_TAIL));
			if (messages.length <= keep + 2) {
				return {
					content: [{ type: "text", text: "Nothing to compress — conversation is already short." }],
					details: undefined,
				};
			}
			const head = messages.slice(0, Math.max(0, messages.length - keep));
			const tail = messages.slice(messages.length - keep);
			const lines: string[] = [];
			for (const m of head) {
				const text = messageText(m.content).trim();
				if (!text) continue;
				const excerpt = text.length > 400 ? `${text.slice(0, 400)}…` : text;
				lines.push(`- ${m.role}: ${excerpt.replace(/\s+/g, " ")}`);
			}
			const summary = [
				`[Compressed conversation section — ${head.length} turns folded${p.reason ? `; reason: ${p.reason}` : ""}]`,
				"Key points from earlier turns (re-read files if you need exact contents):",
				...lines.slice(0, 80),
				lines.length > 80 ? `… and ${lines.length - 80} more` : "",
			]
				.filter(Boolean)
				.join("\n");

			const folded = [{ role: "user", content: [{ type: "text", text: summary }] }, ...tail];
			target.setMessages(folded);
			return {
				content: [
					{
						type: "text",
						text: `Compressed ${head.length} older turns into a summary. Kept last ${tail.length} turns. Summary length: ${summary.length} chars.`,
					},
				],
				details: undefined,
			};
		},
	};
}

export function createContextStatusTool(getTarget: () => CompressTarget | undefined): AgentTool {
	return {
		name: "context_status",
		label: "context_status",
		description: "Report conversation size (message count) so you know when to call compress.",
		parameters: Type.Object({}),
		async execute(): Promise<AgentToolResult<undefined>> {
			const target = getTarget();
			if (!target) {
				throw new Error("context_status: no session");
			}
			const messages = target.getMessages();
			let chars = 0;
			for (const m of messages) chars += messageText(m.content).length;
			return {
				content: [
					{
						type: "text",
						text: `Messages: ${messages.length}\nApprox characters: ${chars}\nWhen context grows large, call compress (keepTail 8–16).`,
					},
				],
				details: undefined,
			};
		},
	};
}

export const CONTEXT_PROMPT_GUIDELINES = [
	"When the conversation is very long or context is near the window, call compress before continuing multi-step work.",
	"Use context_status if you need a size check.",
];
