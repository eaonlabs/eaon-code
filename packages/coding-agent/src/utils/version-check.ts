import { compare, valid } from "semver";
import { APP_NAME, EAON_CODE_PACKAGE_NAME } from "../config.ts";
import { fetchWithRetry } from "./management-http.ts";

const LATEST_VERSION_URL = `https://registry.npmjs.org/${encodeURIComponent(EAON_CODE_PACKAGE_NAME)}/latest`;
const DEFAULT_VERSION_CHECK_TIMEOUT_MS = 10000;

export interface LatestRelease {
	version: string;
	note?: string;
}

/** Include useful errno details hidden behind Node's generic "fetch failed" error. */
export function formatVersionCheckError(error: unknown): string {
	const rootMessage = error instanceof Error && error.message ? error.message : String(error);
	const cause = error instanceof Error ? error.cause : undefined;
	const causes = cause instanceof AggregateError ? cause.errors : cause === undefined ? [] : [cause];
	const codes = causes
		.map((value) =>
			typeof value === "object" && value !== null && "code" in value && typeof value.code === "string"
				? value.code
				: undefined,
		)
		.filter((code): code is string => code !== undefined);

	if (codes.length > 0) return `${rootMessage} (${[...new Set(codes)].join(", ")})`;
	const causeMessage = causes.find(
		(value): value is Error => value instanceof Error && Boolean(value.message),
	)?.message;
	return causeMessage ? `${rootMessage} (cause: ${causeMessage})` : rootMessage;
}

export function comparePackageVersions(leftVersion: string, rightVersion: string): number | undefined {
	const left = valid(leftVersion.trim());
	const right = valid(rightVersion.trim());
	if (!left || !right) {
		return undefined;
	}
	return compare(left, right);
}

export function isNewerPackageVersion(candidateVersion: string, currentVersion: string): boolean {
	const comparison = comparePackageVersions(candidateVersion, currentVersion);
	if (comparison !== undefined) {
		return comparison > 0;
	}
	return candidateVersion.trim() !== currentVersion.trim();
}

export async function getLatestRelease(
	currentVersion: string,
	options: { timeoutMs?: number; retry?: boolean } = {},
): Promise<LatestRelease | undefined> {
	if (process.env.EAON_CODE_OFFLINE || process.env.PI_OFFLINE) return undefined;

	const response = await fetchWithRetry(
		LATEST_VERSION_URL,
		{
			headers: {
				"User-Agent": `${APP_NAME}/${currentVersion}`,
				accept: "application/json",
			},
		},
		{
			maxRetries: options.retry ? 2 : 0,
			timeoutMs: options.timeoutMs ?? DEFAULT_VERSION_CHECK_TIMEOUT_MS,
		},
	);
	if (!response.ok) return undefined;

	const data = (await response.json()) as {
		version?: unknown;
		note?: unknown;
	};
	if (typeof data.version !== "string" || !data.version.trim()) {
		return undefined;
	}
	const note = typeof data.note === "string" && data.note.trim() ? data.note.trim() : undefined;
	return {
		version: data.version.trim(),
		...(note ? { note } : {}),
	};
}

export async function getLatestVersion(
	currentVersion: string,
	options: { timeoutMs?: number; retry?: boolean } = {},
): Promise<string | undefined> {
	return (await getLatestRelease(currentVersion, options))?.version;
}
