/**
 * Plan mode: read-only exploration. Toggleable via /plan.
 * Disables write/edit; injects planning instructions into the system prompt.
 */

export const PLAN_MODE_PROMPT = `# Plan mode (active)

You are in PLAN MODE — read-only. Do not modify files, install packages, or run destructive commands.

Goals:
1. Explore the codebase with read/grep/find/ls (and safe bash like git status, ls, head).
2. Produce a clear, numbered implementation plan before any code changes.
3. Keep the plan concrete: files to touch, functions to add/change, risks, and test steps.

When you finish planning, present:

## Plan
1. …
2. …
3. …

## Files
- path/to/file.ts — why

## Risks / open questions
- …

Then STOP. Wait for the user to approve before writing code (they will turn plan mode off with /plan).`;

export function isDestructiveBash(command: string): boolean {
	const destructive = [
		/\brm\b/i,
		/\brmdir\b/i,
		/\bmv\b/i,
		/\bchmod\b/i,
		/\bchown\b/i,
		/\bsudo\b/i,
		/\btee\b/i,
		/\bdd\b/i,
		/\bnpm\s+(install|uninstall|update|ci|publish)/i,
		/\byarn\s+(add|remove|install|publish)/i,
		/\bpnpm\s+(add|remove|install|publish)/i,
		/\bpip\s+(install|uninstall)/i,
		/\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|stash|cherry-pick|revert|tag|init|clone)/i,
		/\bkill\b/i,
		/(^|[^<])>(?!>)/,
		/>>/,
	];
	return destructive.some((re) => re.test(command));
}

export function isReadOnlyBash(command: string): boolean {
	const safe = [
		/^\s*(cat|head|tail|less|more|grep|rg|find|fd|ls|pwd|echo|printf|wc|sort|uniq|diff|file|stat|du|df|tree|which|type|env|printenv|uname|whoami|id|date|uptime|ps)\b/,
		/^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i,
		/^\s*(npm|pnpm|yarn)\s+(ls|list|view|info|outdated)/i,
	];
	return safe.some((re) => re.test(command.trim()));
}

export function planModeBashBlockedReason(command: string): string | undefined {
	if (isReadOnlyBash(command) && !isDestructiveBash(command)) return undefined;
	if (isDestructiveBash(command)) {
		return "Plan mode is on: this command can modify the system. Turn plan mode off with /plan first.";
	}
	return "Plan mode is on: only read-only commands are allowed. Turn plan mode off with /plan first.";
}

/** Tools allowed while plan mode is on. */
export const PLAN_MODE_TOOLS = ["read", "bash", "grep", "find", "ls"] as const;

export function toolsForPlanMode(allToolNames: string[]): string[] {
	const allow = new Set<string>(PLAN_MODE_TOOLS);
	return allToolNames.filter((n) => allow.has(n));
}
