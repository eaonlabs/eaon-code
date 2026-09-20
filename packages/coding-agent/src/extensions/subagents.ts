import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPackageDir, isBunBinary } from "../config.ts";

const SUBAGENTS_ENTRY = "@tintinweb/pi-subagents/src/index.ts";

export function getBundledSubagentsExtensionPath(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "extensions", "pi-subagents", "src", "index.ts");
	}
	const copiedEntry = join(getPackageDir(), "dist", "extensions", "pi-subagents", "src", "index.ts");
	if (existsSync(copiedEntry)) {
		return copiedEntry;
	}
	return fileURLToPath(import.meta.resolve(SUBAGENTS_ENTRY));
}
