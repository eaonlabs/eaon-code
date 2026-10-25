// Parse bun.lock. bun writes it as JSONC: trailing commas are allowed.
export function parseBunLock(text) {
	return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}
