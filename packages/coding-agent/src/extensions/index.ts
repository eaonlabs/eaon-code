import type { InlineExtension, LoadExtensionsResult } from "../core/extensions/types.ts";
import llamaExtension from "./llama/index.ts";
import { getBundledSubagentsExtensionPath } from "./subagents.ts";

export const builtInExtensions: InlineExtension[] = [{ name: "llama.cpp", factory: llamaExtension, hidden: true }];

export const builtInExtensionPaths = [getBundledSubagentsExtensionPath()] as const;

export function hideBundledExtensions(result: LoadExtensionsResult): LoadExtensionsResult {
	return {
		...result,
		extensions: result.extensions.map((extension) =>
			builtInExtensionPaths.some((path) => path === extension.path) ? { ...extension, hidden: true } : extension,
		),
	};
}
