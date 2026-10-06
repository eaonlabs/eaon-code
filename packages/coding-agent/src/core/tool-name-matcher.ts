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

export function isMcpToolName(name: string): boolean {
	return name.startsWith("mcp__");
}
