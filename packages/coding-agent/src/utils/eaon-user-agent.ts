export function getEaonUserAgent(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `eaon-code/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}
