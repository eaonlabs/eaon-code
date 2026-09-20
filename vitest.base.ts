import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export const workspaceSourcePaths = {
	chordIndex: fileURLToPath(new URL("./packages/chord/src/index.ts", import.meta.url)),
	chordContext: fileURLToPath(new URL("./packages/chord/src/context/index.ts", import.meta.url)),
	chordDelta: fileURLToPath(new URL("./packages/chord/src/delta/index.ts", import.meta.url)),
	chordBundler: fileURLToPath(new URL("./packages/chord/src/bundler.ts", import.meta.url)),
	chordNode: fileURLToPath(new URL("./packages/chord/src/node.ts", import.meta.url)),
	telemetryIndex: fileURLToPath(new URL("./packages/telemetry/src/index.ts", import.meta.url)),
	telemetryTesting: fileURLToPath(new URL("./packages/telemetry/src/testing/index.ts", import.meta.url)),
	aiIndex: fileURLToPath(new URL("./packages/ai/src/index.ts", import.meta.url)),
	aiCompat: fileURLToPath(new URL("./packages/ai/src/compat.ts", import.meta.url)),
	aiOAuth: fileURLToPath(new URL("./packages/ai/src/oauth.ts", import.meta.url)),
	aiProviders: fileURLToPath(new URL("./packages/ai/src/providers", import.meta.url)),
	aiUtils: fileURLToPath(new URL("./packages/ai/src/utils", import.meta.url)),
	agentIndex: fileURLToPath(new URL("./packages/agent/src/index.ts", import.meta.url)),
	agentNode: fileURLToPath(new URL("./packages/agent/src/node.ts", import.meta.url)),
	protocolIndex: fileURLToPath(new URL("./packages/protocol/src/index.ts", import.meta.url)),
	clientIndex: fileURLToPath(new URL("./packages/client/src/index.ts", import.meta.url)),
	clientUnix: fileURLToPath(new URL("./packages/client/src/unix.ts", import.meta.url)),
	serverIndex: fileURLToPath(new URL("./packages/server/src/index.ts", import.meta.url)),
	serverUnix: fileURLToPath(new URL("./packages/server/src/transports/unix/index.ts", import.meta.url)),
	codingAgentIndex: fileURLToPath(new URL("./packages/coding-agent/src/index.ts", import.meta.url)),
	tuiIndex: fileURLToPath(new URL("./packages/tui/src/index.ts", import.meta.url)),
} as const;

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^@eaonlabs\/chord$/, replacement: workspaceSourcePaths.chordIndex },
			{ find: /^@eaonlabs\/chord\/context$/, replacement: workspaceSourcePaths.chordContext },
			{ find: /^@eaonlabs\/chord\/delta$/, replacement: workspaceSourcePaths.chordDelta },
			{ find: /^@eaonlabs\/chord\/bundler$/, replacement: workspaceSourcePaths.chordBundler },
			{ find: /^@eaonlabs\/chord\/node$/, replacement: workspaceSourcePaths.chordNode },
			{ find: /^@eaonlabs\/eaon-telemetry$/, replacement: workspaceSourcePaths.telemetryIndex },
			{ find: /^@eaonlabs\/eaon-telemetry\/testing$/, replacement: workspaceSourcePaths.telemetryTesting },
			{ find: /^@eaonlabs\/eaon-ai$/, replacement: workspaceSourcePaths.aiIndex },
			{ find: /^@eaonlabs\/eaon-ai\/compat$/, replacement: workspaceSourcePaths.aiCompat },
			{ find: /^@eaonlabs\/eaon-ai\/oauth$/, replacement: workspaceSourcePaths.aiOAuth },
			{
				find: /^@eaonlabs\/eaon-ai\/providers\/(.+)$/,
				replacement: `${workspaceSourcePaths.aiProviders}/$1.ts`,
			},
			{ find: /^@eaonlabs\/eaon-agent-core$/, replacement: workspaceSourcePaths.agentIndex },
			{ find: /^@eaonlabs\/eaon-agent-core\/node$/, replacement: workspaceSourcePaths.agentNode },
			{ find: /^@eaonlabs\/eaon-protocol$/, replacement: workspaceSourcePaths.protocolIndex },
			{ find: /^@eaonlabs\/eaon-client$/, replacement: workspaceSourcePaths.clientIndex },
			{ find: /^@eaonlabs\/eaon-client\/unix$/, replacement: workspaceSourcePaths.clientUnix },
			{ find: /^@eaonlabs\/eaon-server$/, replacement: workspaceSourcePaths.serverIndex },
			{ find: /^@eaonlabs\/eaon-server\/unix$/, replacement: workspaceSourcePaths.serverUnix },
			{ find: /^@eaonlabs\/eaon-tui$/, replacement: workspaceSourcePaths.tuiIndex },
		],
	},
});
