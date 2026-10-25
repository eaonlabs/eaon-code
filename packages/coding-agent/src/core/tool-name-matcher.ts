export function createToolNameMatcher(patterns: readonly string[]): (name: string) => boolean {
	const matchers = patterns.map((pattern) => {
		const source = pattern
			.split("*")
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*");
		return new RegExp(`^${source}$`);
	});
	return (name) => matchers.some((matcher) => matcher.test(name));
}

/** MCP resource tools, which reach every server with resources. Named as in extensions/mcp/resources.ts. */
const MCP_RESOURCE_TOOLS: ReadonlySet<string> = new Set([
	"list_mcp_resources",
	"list_mcp_resource_templates",
	"read_mcp_resource",
]);

/** Whether a tool comes from MCP: a server tool (`mcp__<server>__<tool>`) or a resource tool. */
export function isMcpToolName(name: string): boolean {
	return name.startsWith("mcp__") || MCP_RESOURCE_TOOLS.has(name);
}
