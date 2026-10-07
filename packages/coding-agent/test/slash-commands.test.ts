import { describe, expect, it } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../src/core/slash-commands.ts";

describe("built-in slash commands", () => {
	it("leaves /mcp to the MCP extension", () => {
		expect(BUILTIN_SLASH_COMMANDS.map((command) => command.name)).not.toContain("mcp");
	});
});
