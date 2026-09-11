import { join } from "node:path";
import { getDocsPath } from "../config.ts";

const UNKNOWN_PROVIDER = "unknown";

/** Short, actionable login help. Prefer this over long doc dumps in the TUI. */
export function getProviderLoginHelp(): string {
	return [
		"Next step: type  /login  and pick a provider (Anthropic, OpenAI, Google, …).",
		"Or set an API key env var and restart, e.g.:",
		"  export ANTHROPIC_API_KEY=sk-ant-...",
		"",
		"More detail:",
		`  ${join(getDocsPath(), "providers.md")}`,
	].join("\n");
}

export function formatNoModelsAvailableMessage(): string {
	return [
		"No models available yet.",
		"",
		getProviderLoginHelp(),
	].join("\n");
}

export function formatNoModelSelectedMessage(): string {
	return [
		"No model selected.",
		"",
		getProviderLoginHelp(),
		"",
		"Then type  /model  to choose one.",
	].join("\n");
}

export function formatNoApiKeyFoundMessage(provider: string): string {
	const providerDisplay = provider === UNKNOWN_PROVIDER ? "the selected model" : provider;
	return [
		`No API key for ${providerDisplay}.`,
		"",
		getProviderLoginHelp(),
	].join("\n");
}
