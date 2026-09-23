/**
 * Test helper for resolving API keys from ~/.pi/agent/auth.json
 *
 * Supports both API key and OAuth credentials.
 * OAuth tokens are automatically refreshed if expired and saved back to auth.json.
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import type { OAuthCredentials } from "../src/auth/types.ts";
import { builtinProviders } from "../src/providers/all.ts";

const DEFAULT_AGENT_DIR = mkdtempSync(join(tmpdir(), "eaon-ai-test-agent-"));
process.once("exit", () => rmSync(DEFAULT_AGENT_DIR, { recursive: true, force: true }));

function getAuthPath(): string {
	return join(process.env.PI_CODING_AGENT_DIR ?? DEFAULT_AGENT_DIR, "auth.json");
}

type ApiKeyCredential = {
	type: "api_key";
	key: string;
};

type OAuthCredentialEntry = {
	type: "oauth";
} & OAuthCredentials;

type AuthCredential = ApiKeyCredential | OAuthCredentialEntry;

type AuthStorage = Record<string, AuthCredential>;

function loadAuthStorage(): AuthStorage {
	const authPath = getAuthPath();
	if (!existsSync(authPath)) {
		return {};
	}
	try {
		const content = readFileSync(authPath, "utf-8");
		return JSON.parse(content);
	} catch {
		return {};
	}
}

function saveAuthStorage(storage: AuthStorage): void {
	const authPath = getAuthPath();
	const configDir = dirname(authPath);
	if (!existsSync(configDir)) {
		mkdirSync(configDir, { recursive: true, mode: 0o700 });
	}
	writeFileSync(authPath, JSON.stringify(storage, null, 2), "utf-8");
	chmodSync(authPath, 0o600);
}

/**
 * Resolve API key for a provider from ~/.pi/agent/auth.json
 *
 * For API key credentials, returns the key directly.
 * For OAuth credentials, returns the access token (refreshing if expired and saving back).
 *
 */
export async function resolveApiKey(provider: string): Promise<string | undefined> {
	const storage = loadAuthStorage();
	const entry = storage[provider];

	if (!entry) return undefined;

	if (entry.type === "api_key") {
		return entry.key;
	}

	if (entry.type === "oauth") {
		const oauth = builtinProviders().find((candidate) => candidate.id === provider)?.auth.oauth;
		if (!oauth) return undefined;
		let credential = entry;
		try {
			if (Date.now() >= credential.expires) {
				credential = await oauth.refresh(credential, new AbortController().signal);
			}
		} catch (error) {
			console.log(JSON.stringify(error));
			return undefined;
		}
		storage[provider] = credential;
		saveAuthStorage(storage);
		return (await oauth.toAuth(credential)).apiKey;
	}

	return undefined;
}
