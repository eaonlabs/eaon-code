import { describe, expect, it, vi } from "vitest";
import { VERSION } from "../src/config.ts";
import { McpClient } from "../src/core/mcp.ts";

const mockServer = String.raw`
let buffer = "";
let clientVersion = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
	buffer += chunk;
	let newline = buffer.indexOf("\n");
	while (newline >= 0) {
		const message = JSON.parse(buffer.slice(0, newline));
		buffer = buffer.slice(newline + 1);
		if (message.method === "initialize") {
			clientVersion = message.params.clientInfo.version;
			process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2024-11-05" } }) + "\n");
		} else if (message.method === "tools/list") {
			process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: clientVersion }] } }) + "\n");
		}
		newline = buffer.indexOf("\n");
	}
});
`;

describe("MCP client version", () => {
	it("advertises the current Eaon Code package version during initialization", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout"] });
		const client = new McpClient("version-test", { command: process.execPath, args: ["-e", mockServer] });
		try {
			await client.connect();
			expect(client.tools.map((tool) => tool.name)).toEqual([VERSION]);
		} finally {
			await client.close();
			vi.useRealTimers();
		}
	});
});
