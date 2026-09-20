import { describe, expect, it } from "vitest";
import { SWARM_MAX_AGENTS, SWARM_MIN_AGENTS, SWARM_MODE_PROMPT, SWARM_TOOL_NAME } from "../src/core/swarm-prompt.ts";

describe("swarm mode prompt", () => {
	it("routes delegation through the bundled sub-agent tool", () => {
		expect(SWARM_TOOL_NAME).toBe("Agent");
		expect(SWARM_MIN_AGENTS).toBe(2);
		expect(SWARM_MAX_AGENTS).toBe(6);
		expect(SWARM_MODE_PROMPT).toContain(`\`${SWARM_TOOL_NAME}\``);
	});
});
