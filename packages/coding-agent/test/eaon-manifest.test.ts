import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { readEaonManifest } from "../src/core/eaon-manifest.ts";

let tempDir: string | undefined;

afterEach(() => {
	if (tempDir) {
		rmSync(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

function readPackageManifest(value: Record<string, unknown>) {
	tempDir = mkdtempSync(join(tmpdir(), "eaon-manifest-"));
	const packageJsonPath = join(tempDir, "package.json");
	writeFileSync(packageJsonPath, JSON.stringify(value));
	return readEaonManifest(packageJsonPath);
}

describe("Eaon package manifests", () => {
	test("reads Eaon resources and prefers the Eaon key when both formats are present", () => {
		expect(
			readPackageManifest({
				eaon: { extensions: ["./eaon-extension.ts"] },
				pi: { extensions: ["./legacy-extension.ts"] },
			}),
		).toEqual({ extensions: ["./eaon-extension.ts"] });
	});

	test("continues to read a legacy package manifest", () => {
		expect(readPackageManifest({ pi: { skills: ["./skills"] } })).toEqual({ skills: ["./skills"] });
	});
});
