import betterwrightExtension from "betterwright/pi-extension";
import type { InlineExtension, LoadExtensionsResult } from "../core/extensions/types.ts";
import codemodeExtension from "./codemode/index.ts";
import llamaExtension from "./llama/index.ts";
import mcpExtension from "./mcp/index.ts";
import { getBundledSubagentsExtensionPath } from "./subagents.ts";
import toolSearchExtension from "./tool-search/index.ts";

export const builtInExtensions: InlineExtension[] = [
	{ name: "BetterWright", factory: betterwrightExtension, builtin: true, hidden: true },
	{ name: "llama.cpp", factory: llamaExtension, builtin: true },
	// Replaceable: an extension that registers `codemode`, `tool_search`, or `/mcp` (such as a third-party
	// MCP extension) takes over instead of running alongside the built-in one.
	{ name: "codemode", factory: codemodeExtension, replaceable: true, builtin: true },
	{ name: "tool-search", factory: toolSearchExtension, replaceable: true, builtin: true },
	{ name: "mcp", factory: mcpExtension, replaceable: true, builtin: true },
];

export const builtInExtensionPaths = [getBundledSubagentsExtensionPath()] as const;

export function hideBundledExtensions(result: LoadExtensionsResult): LoadExtensionsResult {
	return {
		...result,
		extensions: result.extensions.map((extension) =>
			builtInExtensionPaths.some((path) => path === extension.path) ? { ...extension, hidden: true } : extension,
		),
	};
}
