import { readFileSync } from "node:fs";
import { stripBom } from "../utils/text.ts";

export interface EaonManifest {
	extensions?: string[];
	skills?: string[];
	prompts?: string[];
	themes?: string[];
}

const RESOURCE_FIELDS = ["extensions", "skills", "prompts", "themes"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readEaonManifest(packageJsonPath: string): EaonManifest | null {
	try {
		const pkg: unknown = JSON.parse(stripBom(readFileSync(packageJsonPath, "utf-8")));
		if (!isObject(pkg)) {
			return null;
		}
		const resourceManifest = isObject(pkg.eaon) ? pkg.eaon : pkg.pi;
		if (!isObject(resourceManifest)) return null;

		const manifest: EaonManifest = {};
		for (const field of RESOURCE_FIELDS) {
			const entries = resourceManifest[field];
			if (Array.isArray(entries) && entries.every((entry) => typeof entry === "string")) {
				manifest[field] = entries;
			}
		}
		return manifest;
	} catch {
		return null;
	}
}
