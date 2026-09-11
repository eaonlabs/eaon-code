import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/**
 * Exact matches for bare specifiers, plus one rule per package for subpath exports such as
 * `@eaonlabs/eaon-ai/utils/uuid`. A prefix alias would rewrite those onto `index.ts/utils/uuid`.
 */
export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
	},
	resolve: {
		conditions: ["source"],
		alias: [
			{ find: /^@eaonlabs\/eaon-agent-core$/, replacement: src("../agent/src/index.ts") },
			{ find: /^@eaonlabs\/eaon-agent-core\/(.+)$/, replacement: `${src("../agent/src/")}$1.ts` },
			{ find: /^@eaonlabs\/eaon-ai$/, replacement: src("../ai/src/index.ts") },
			{ find: /^@eaonlabs\/eaon-ai\/(.+)$/, replacement: `${src("../ai/src/")}$1.ts` },
			{ find: /^@eaonlabs\/eaon-telemetry$/, replacement: src("../telemetry/src/index.ts") },
			{ find: /^@eaonlabs\/eaon-protocol$/, replacement: src("../protocol/src/index.ts") },
		],
	},
	ssr: { resolve: { conditions: ["source"] } },
});
