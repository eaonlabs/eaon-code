import { APP_NAME } from "../config.ts";
import { configureHttpDispatcher } from "../core/http-dispatcher.ts";

export function setupCli(): void {
	process.title = APP_NAME;
	process.env.EAON_CODE_CODING_AGENT = "true";
	process.env.PI_CODING_AGENT = "true";
	process.env.AI_AGENT = "eaon-code";
	if (process.env.EAON_CODE_OFFLINE !== undefined) process.env.PI_OFFLINE = process.env.EAON_CODE_OFFLINE;
	if (process.env.EAON_CODE_TELEMETRY !== undefined) process.env.PI_TELEMETRY = process.env.EAON_CODE_TELEMETRY;
	process.emitWarning = (() => {}) as typeof process.emitWarning;

	// Configure undici before provider SDKs issue requests. Settings are applied
	// once SettingsManager has loaded global/project configuration.
	configureHttpDispatcher();
}
