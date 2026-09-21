import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/config.ts";

describe("release site version", () => {
	it("shows the current package version in its terminal example", () => {
		const site = readFileSync(new URL("../../../site/index.html", import.meta.url), "utf8");

		expect(site).toContain(`eaon-code v${VERSION}`);
	});
});
