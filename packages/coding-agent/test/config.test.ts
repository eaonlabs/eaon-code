import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, test } from "vitest";
import {
	detectInstallMethod,
	findNodePackageDir,
	getAgentDir,
	getProjectConfigDir,
	getSelfUpdateUnavailableInstruction,
	getShareViewerUrl,
	INSTALLER_COMMAND,
} from "../src/config.ts";

const execPathDescriptor = Object.getOwnPropertyDescriptor(process, "execPath");
const originalPath = process.env.PATH;
const originalHome = process.env.HOME;
const originalEaonAgentDir = process.env.EAON_CODE_CODING_AGENT_DIR;
const originalPiAgentDir = process.env.PI_CODING_AGENT_DIR;
const originalEaonShareViewerUrl = process.env.EAON_CODE_SHARE_VIEWER_URL;
const originalPiShareViewerUrl = process.env.PI_SHARE_VIEWER_URL;
const originalPiPackageDir = process.env.PI_PACKAGE_DIR;
const originalArgv1 = process.argv[1];
let tempDir: string | undefined;

function setExecPath(value: string): void {
	Object.defineProperty(process, "execPath", {
		value,
		configurable: true,
	});
}

afterEach(() => {
	if (execPathDescriptor) {
		Object.defineProperty(process, "execPath", execPathDescriptor);
	}
	if (originalPath === undefined) {
		delete process.env.PATH;
	} else {
		process.env.PATH = originalPath;
	}
	if (originalHome === undefined) {
		delete process.env.HOME;
	} else {
		process.env.HOME = originalHome;
	}
	if (originalEaonAgentDir === undefined) {
		delete process.env.EAON_CODE_CODING_AGENT_DIR;
	} else {
		process.env.EAON_CODE_CODING_AGENT_DIR = originalEaonAgentDir;
	}
	if (originalPiAgentDir === undefined) {
		delete process.env.PI_CODING_AGENT_DIR;
	} else {
		process.env.PI_CODING_AGENT_DIR = originalPiAgentDir;
	}
	if (originalEaonShareViewerUrl === undefined) {
		delete process.env.EAON_CODE_SHARE_VIEWER_URL;
	} else {
		process.env.EAON_CODE_SHARE_VIEWER_URL = originalEaonShareViewerUrl;
	}
	if (originalPiShareViewerUrl === undefined) {
		delete process.env.PI_SHARE_VIEWER_URL;
	} else {
		process.env.PI_SHARE_VIEWER_URL = originalPiShareViewerUrl;
	}
	if (originalPiPackageDir === undefined) {
		delete process.env.PI_PACKAGE_DIR;
	} else {
		process.env.PI_PACKAGE_DIR = originalPiPackageDir;
	}
	if (originalArgv1 === undefined) {
		process.argv.splice(1, 1);
	} else {
		process.argv[1] = originalArgv1;
	}
	if (tempDir) {
		chmodSync(tempDir, 0o700);
		rmSync(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

describe("Eaon config paths", () => {
	test("uses Eaon paths by default and keeps existing legacy directories usable", () => {
		const homeDir = mkdtempSync(join(tmpdir(), "eaon-config-paths-"));
		tempDir = homeDir;
		process.env.HOME = homeDir;
		delete process.env.EAON_CODE_CODING_AGENT_DIR;
		delete process.env.PI_CODING_AGENT_DIR;

		const legacyAgentDir = join(homeDir, ".pi", "agent");
		mkdirSync(legacyAgentDir, { recursive: true });
		expect(getAgentDir()).toBe(legacyAgentDir);

		const projectDir = join(homeDir, "project");
		const legacyProjectDir = join(projectDir, ".pi");
		mkdirSync(legacyProjectDir, { recursive: true });
		expect(getProjectConfigDir(projectDir)).toBe(legacyProjectDir);

		const eaonAgentDir = join(homeDir, ".eaon", "agent");
		mkdirSync(eaonAgentDir, { recursive: true });
		expect(getAgentDir()).toBe(eaonAgentDir);

		const eaonProjectDir = join(projectDir, ".eaon");
		mkdirSync(eaonProjectDir, { recursive: true });
		expect(getProjectConfigDir(projectDir)).toBe(eaonProjectDir);
	});
});

describe("Share URLs", () => {
	test("uses GitHub Gist directly by default", () => {
		delete process.env.EAON_CODE_SHARE_VIEWER_URL;
		delete process.env.PI_SHARE_VIEWER_URL;
		expect(getShareViewerUrl("gist-id")).toBe("https://gist.github.com/gist-id");
	});

	test("prefers the Eaon viewer override and still accepts the legacy override", () => {
		process.env.EAON_CODE_SHARE_VIEWER_URL = "https://share.eaon.dev/session/";
		process.env.PI_SHARE_VIEWER_URL = "https://legacy.example/session/";
		expect(getShareViewerUrl("gist-id")).toBe("https://share.eaon.dev/session/#gist-id");
		delete process.env.EAON_CODE_SHARE_VIEWER_URL;
		expect(getShareViewerUrl("gist-id")).toBe("https://legacy.example/session/#gist-id");
	});
});

describe("findNodePackageDir", () => {
	test("skips binary metadata copied into dist", () => {
		tempDir = mkdtempSync(join(tmpdir(), "pi-package-dir-"));
		const distDir = join(tempDir, "dist");
		const bundleDir = join(distDir, "bundle");
		mkdirSync(bundleDir, { recursive: true });
		writeFileSync(join(tempDir, "package.json"), "{}");
		writeFileSync(join(distDir, "package.json"), "{}");

		expect(findNodePackageDir(bundleDir)).toBe(tempDir);
	});
});

describe("detectInstallMethod", () => {
	test("reports wrapper and source installs as unknown, with the installer as the update path", () => {
		setExecPath("/usr/local/bin/node");

		expect(detectInstallMethod()).toBe("unknown");
		expect(getSelfUpdateUnavailableInstruction()).toBe(
			`Re-run the installer to update this installation: ${INSTALLER_COMMAND}`,
		);
	});
});
