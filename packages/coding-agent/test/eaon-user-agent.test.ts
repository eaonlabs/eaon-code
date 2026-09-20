import { describe, expect, it } from "vitest";
import { getEaonUserAgent } from "../src/utils/eaon-user-agent.ts";

describe("getEaonUserAgent", () => {
	it("formats the Eaon Code user agent", () => {
		const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
		const userAgent = getEaonUserAgent("1.2.3");

		expect(userAgent).toBe(`eaon-code/1.2.3 (${process.platform}; ${runtime}; ${process.arch})`);
		expect(userAgent).toMatch(/^eaon-code\/[^\s()]+ \([^;()]+;\s*[^;()]+;\s*[^()]+\)$/);
	});
});
