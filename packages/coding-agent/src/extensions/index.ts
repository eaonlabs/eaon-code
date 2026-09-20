import type { InlineExtension } from "../core/extensions/types.ts";
import llamaExtension from "./llama/index.ts";
import { getBundledSubagentsExtensionPath } from "./subagents.ts";

export const builtInExtensions: InlineExtension[] = [{ name: "llama.cpp", factory: llamaExtension, hidden: true }];

export const builtInExtensionPaths = [getBundledSubagentsExtensionPath()] as const;
