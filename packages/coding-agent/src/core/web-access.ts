/**
 * Built-in web access for Eaon Code (no extra install).
 * Keyless: DuckDuckGo HTML search + fetch + text extraction.
 */

import type { AgentTool, AgentToolResult } from "@eaonlabs/eaon-agent-core";
import { Type } from "typebox";

const USER_AGENT =
	"EaonCode/0.85 (https://github.com/eaonlabs/eaon-code; coding agent web access)";
const MAX_BODY = 80_000;

function stripTags(html: string): string {
	let s = html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
	s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
	return s.length > MAX_BODY ? `${s.slice(0, MAX_BODY)}\n\n[truncated]` : s;
}

function decodeDdgHref(href: string): string {
	// //duckduckgo.com/l/?uddg=<encoded>
	const m = href.match(/[?&]uddg=([^&]+)/);
	if (m) {
		try {
			return decodeURIComponent(m[1]!);
		} catch {
			/* fall through */
		}
	}
	return href;
}

export async function webSearchDdg(query: string, numResults: number): Promise<string> {
	const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
	const res = await fetch(url, {
		headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
		signal: AbortSignal.timeout(20_000),
	});
	if (!res.ok) throw new Error(`DuckDuckGo search failed: HTTP ${res.status}`);
	const html = await res.text();
	const results: string[] = [];
	const re =
		/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>)?/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) && results.length < numResults) {
		const href = decodeDdgHref(m[1] ?? "");
		const title = stripTags(m[2] ?? "").replace(/\s+/g, " ").trim();
		const snippet = stripTags(m[3] ?? "").replace(/\s+/g, " ").trim();
		if (!title && !href) continue;
		results.push(`${results.length + 1}. ${title}\n   ${href}${snippet ? `\n   ${snippet}` : ""}`);
	}
	if (results.length === 0) {
		// fallback: grab any result links
		const loose = html.match(/uddg=([^&"]+)/g) ?? [];
		const seen = new Set<string>();
		for (const hit of loose) {
			const href = decodeDdgHref(hit);
			if (seen.has(href)) continue;
			seen.add(href);
			results.push(`${results.length + 1}. ${href}`);
			if (results.length >= numResults) break;
		}
	}
	if (results.length === 0) return `No results for: ${query}`;
	return `Web search: ${query}\n\n${results.join("\n\n")}`;
}

export async function fetchUrlAsText(url: string): Promise<string> {
	// Jina Reader is keyless and renders many JS pages
	const jina = `https://r.jina.ai/${url}`;
	try {
		const res = await fetch(jina, {
			headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
			signal: AbortSignal.timeout(30_000),
		});
		if (res.ok) {
			const text = await res.text();
			if (text.trim().length > 80) {
				return text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}\n\n[truncated]` : text;
			}
		}
	} catch {
		/* fall through to direct fetch */
	}

	const res = await fetch(url, {
		headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,text/plain,text/markdown" },
		redirect: "follow",
		signal: AbortSignal.timeout(30_000),
	});
	if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} for ${url}`);
	const type = res.headers.get("content-type") ?? "";
	const body = await res.text();
	if (type.includes("text/html") || body.trimStart().startsWith("<")) {
		return stripTags(body);
	}
	return body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}\n\n[truncated]` : body;
}

export function createWebSearchTool(): AgentTool {
	return {
		name: "web_search",
		description:
			"Search the web (keyless DuckDuckGo). Returns titles, URLs, and short snippets. Use fetch_content to read a full page.",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			numResults: Type.Optional(Type.Number({ minimum: 1, maximum: 10, default: 5 })),
		}),
		async execute(_id: string, params: unknown): Promise<AgentToolResult> {
			const p = params as { query: string; numResults?: number };
			try {
				const text = await webSearchDdg(p.query, p.numResults ?? 5);
				return { content: [{ type: "text", text }], isError: false };
			} catch (e) {
				return {
					content: [{ type: "text", text: `web_search failed: ${e instanceof Error ? e.message : String(e)}` }],
					isError: true,
				};
			}
		},
	};
}

export function createFetchContentTool(): AgentTool {
	return {
		name: "fetch_content",
		description:
			"Fetch a URL and return readable text/markdown. Handles normal pages; GitHub raw and docs work well.",
		parameters: Type.Object({
			url: Type.String({ description: "http(s) URL to fetch" }),
		}),
		async execute(_id: string, params: unknown): Promise<AgentToolResult> {
			const p = params as { url: string };
			try {
				if (!/^https?:\/\//i.test(p.url)) {
					return {
						content: [{ type: "text", text: "fetch_content requires an http(s) URL." }],
						isError: true,
					};
				}
				const text = await fetchUrlAsText(p.url);
				return {
					content: [{ type: "text", text: `# ${p.url}\n\n${text}` }],
					isError: false,
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `fetch_content failed: ${e instanceof Error ? e.message : String(e)}` }],
					isError: true,
				};
			}
		},
	};
}

export const WEB_ACCESS_PROMPT_GUIDELINES = [
	"web_search for current facts, docs, and APIs; fetch_content to read a full page.",
	"Prefer official docs and GitHub over blogs when citing versions or APIs.",
];
