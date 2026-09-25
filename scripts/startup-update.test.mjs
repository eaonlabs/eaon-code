import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const helperPath = fileURLToPath(new URL("./startup-update.mjs", import.meta.url));

function git(root, ...args) {
	execFileSync("git", ["-C", root, ...args], { stdio: "ignore" });
}

test("checks installer source updates and keeps installer output hidden", (t) => {
	const tempRoot = mkdtempSync(join(tmpdir(), "eaon-code-startup-update-"));
	t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

	const upstream = join(tempRoot, "upstream");
	const remote = join(tempRoot, "remote.git");
	const checkout = join(tempRoot, "checkout");
	const installLog = join(tempRoot, "install.log");
	const installFailureMarker = join(tempRoot, "install-failed-once");
	mkdirSync(upstream, { recursive: true });
	execFileSync("git", ["init", "--initial-branch=main", upstream], { stdio: "ignore" });
	git(upstream, "config", "user.name", "Eaon Code test");
	git(upstream, "config", "user.email", "eaon-code-test@example.invalid");
	writeFileSync(join(upstream, "cli.js"), 'process.stdout.write(`${process.argv.slice(2).join(" ")}\\n`);\n');
	writeFileSync(join(upstream, "revision.txt"), "first\n");
	writeFileSync(
		join(upstream, "install.sh"),
		String.raw`if [ ! -f "$EAON_CODE_TEST_INSTALL_FAILURE" ]; then
  : > "$EAON_CODE_TEST_INSTALL_FAILURE"
  exit 23
fi
git -C "$EAON_CODE_PREFIX" reset --hard FETCH_HEAD -q
node - "$EAON_CODE_PREFIX" "$EAON_CODE_REPO" "$EAON_CODE_REF" "$EAON_CODE_BIN_DIR" "$(git -C "$EAON_CODE_PREFIX" rev-parse HEAD)" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [prefix, repo, ref, binDir, installedCommit] = process.argv.slice(2);
fs.writeFileSync(path.join(prefix, ".git", "eaon-code-install.json"), JSON.stringify({
  kind: "eaon-code-source-install",
  schemaVersion: 1,
  repo,
  ref,
  binDir,
  installedCommit,
}));
NODE
printf "installed\\n" >> "$EAON_CODE_TEST_INSTALL_LOG"
printf "installer output must stay hidden\\n"`,
	);
	git(upstream, "add", "cli.js", "revision.txt", "install.sh");
	git(upstream, "commit", "-m", "initial install");
	execFileSync("git", ["clone", "--bare", upstream, remote], { stdio: "ignore" });
	git(remote, "symbolic-ref", "HEAD", "refs/heads/main");
	git(upstream, "remote", "add", "origin", remote);
	execFileSync("git", ["clone", "--depth", "1", "--branch", "main", remote, checkout], { stdio: "ignore" });
	writeFileSync(
		join(checkout, ".git", "eaon-code-install.json"),
		JSON.stringify({
			kind: "eaon-code-source-install",
			schemaVersion: 1,
			repo: "eaonlabs/eaon-code",
			ref: "main",
			binDir: join(tempRoot, "bin"),
			installedCommit: execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
		}),
	);

	const env = {
		...process.env,
		EAON_CODE_TEST_INSTALL_LOG: installLog,
		EAON_CODE_TEST_INSTALL_FAILURE: installFailureMarker,
	};
	delete env.EAON_CODE_OFFLINE;
	delete env.PI_OFFLINE;
	const runHelper = (...args) =>
		spawnSync(process.execPath, [helperPath, checkout, join(checkout, "cli.js"), ...args], {
			encoding: "utf8",
			env,
		});

	const current = runHelper("start");
	assert.equal(current.status, 0);
	assert.equal(current.stdout, "start\n");
	assert.equal(current.stderr, "");

	writeFileSync(join(upstream, "revision.txt"), "second\n");
	git(upstream, "add", "revision.txt");
	git(upstream, "commit", "-m", "update source");
	git(upstream, "push", "origin", "main");

	const failedInstall = runHelper("start");
	assert.equal(failedInstall.status, 0);
	assert.equal(failedInstall.stdout, "start\n");
	assert.equal(failedInstall.stderr, "");
	assert.equal(existsSync(installLog), false);

	const updated = runHelper("start");
	assert.equal(updated.status, 0);
	assert.equal(updated.stdout, "start\n");
	assert.equal(updated.stderr, "");
	assert.equal(readFileSync(installLog, "utf8"), "installed\n");

	const currentAfterUpdate = runHelper("start");
	assert.equal(currentAfterUpdate.status, 0);
	assert.equal(currentAfterUpdate.stdout, "start\n");
	assert.equal(currentAfterUpdate.stderr, "");
	assert.equal(readFileSync(installLog, "utf8"), "installed\n");

	const help = runHelper("--help");
	assert.equal(help.status, 0);
	assert.equal(help.stdout, "--help\n");
	assert.equal(readFileSync(installLog, "utf8"), "installed\n");

	const offline = runHelper("start", "--offline");
	assert.equal(offline.status, 0);
	assert.equal(offline.stdout, "start --offline\n");
	assert.equal(readFileSync(installLog, "utf8"), "installed\n");
});
