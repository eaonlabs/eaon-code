import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";

const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
const agentDir = mkdtempSync(join(tmpdir(), "eaon-ai-oauth-path-"));

afterEach(() => {
	if (originalAgentDir === undefined) {
		delete process.env.PI_CODING_AGENT_DIR;
	} else {
		process.env.PI_CODING_AGENT_DIR = originalAgentDir;
	}
	vi.resetModules();
	rmSync(agentDir, { recursive: true, force: true });
});

it("reads API credentials from the configured agent directory", async () => {
	process.env.PI_CODING_AGENT_DIR = agentDir;
	writeFileSync(
		join(agentDir, "auth.json"),
		JSON.stringify({ "eaon-ai-test-provider": { type: "api_key", key: "isolated-test-key" } }),
	);

	const { resolveApiKey } = await import("./oauth.ts");

	await expect(resolveApiKey("eaon-ai-test-provider")).resolves.toBe("isolated-test-key");
});
