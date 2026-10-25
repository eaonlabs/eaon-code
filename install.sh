#!/usr/bin/env bash
# Eaon Code installer.
#
#   curl -fsSL https://raw.githubusercontent.com/eaonlabs/eaon-code/main/install.sh | bash
#
# Clones eaonlabs/eaon-code, installs workspace deps without lifecycle scripts,
set -euo pipefail

REPO="${EAON_CODE_REPO:-eaonlabs/eaon-code}"
REF="${EAON_CODE_REF:-main}"
PREFIX="${EAON_CODE_PREFIX:-$HOME/.local/share/eaon-code}"
BIN_DIR="${EAON_CODE_BIN_DIR:-$HOME/.local/bin}"
AGENT_DIR="$PREFIX/packages/coding-agent"

die() {
  echo "eaon-code: $*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || die "Node.js is required — install Node 22+ (e.g. brew install node), then re-run."
command -v bun >/dev/null 2>&1 || die "Bun is required — install Bun 1.3+ (https://bun.sh), then re-run."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  die "Node.js >= 22.19 is required (found $(node -v))."
fi

echo "Installing Eaon Code…"

if [ -d "$PREFIX/.git" ]; then
  if ! checkout_status="$(git -C "$PREFIX" status --porcelain --untracked-files=normal)"; then
    die "could not inspect the existing checkout at $PREFIX"
  fi
  if [ -n "$checkout_status" ]; then
    die "$PREFIX contains local changes. Move them or choose another EAON_CODE_PREFIX before updating."
  fi
  git -C "$PREFIX" fetch --depth 1 origin "$REF" -q
  git -C "$PREFIX" reset --hard FETCH_HEAD -q
else
  if [ -e "$PREFIX" ]; then
    die "$PREFIX exists and is not an Eaon Code Git checkout. Move it or choose another EAON_CODE_PREFIX."
  fi
  mkdir -p "$(dirname "$PREFIX")"
  git clone --depth 1 --branch "$REF" -q "https://github.com/${REPO}" "$PREFIX"
fi

cd "$PREFIX"

cleanup_build_generated_model_sources() {
  local exit_status=$?
  trap - EXIT
  if [ -n "${WRAPPER_TMP:-}" ]; then
    rm -f "$WRAPPER_TMP"
  fi
  if ! git -C "$PREFIX" restore -- packages/ai/src/models.generated.ts 'packages/ai/src/providers/*.models.ts'; then
    echo "eaon-code: could not restore generated model source files" >&2
    exit 1
  fi
  exit "$exit_status"
}
trap cleanup_build_generated_model_sources EXIT

# Lifecycle scripts are intentionally skipped — see README supply-chain notes.
# bun install --frozen-lockfile installs exactly what bun.lock records and never rewrites it.
# A rewritten lockfile is a tracked change, and it would block every later update.
bun install --frozen-lockfile --ignore-scripts

echo "Building Eaon Code…"
# Build only what the CLI needs: deps first, then the coding agent bundle.
bun run --cwd packages/chord build
bun run --cwd packages/tui build
bun run --cwd packages/telemetry build
bun run --cwd packages/ai build:offline 2>/dev/null || bun run --cwd packages/ai build
bun run --cwd packages/agent build
bun run --cwd packages/session-backends/sqlite-node build
bun run --cwd packages/protocol build
bun run --cwd packages/client build
bun run --cwd packages/server build
bun run --cwd packages/mcp build
bun run --cwd packages/codemode build
bun run --cwd packages/coding-agent build

CLI="$AGENT_DIR/dist/bundle/cli.js"
[ -f "$CLI" ] || die "build finished but $CLI is missing"

mkdir -p "$BIN_DIR"
WRAPPER_TMP="$(mktemp "$BIN_DIR/.eaon-code.XXXXXX")"
cat >"$WRAPPER_TMP" <<EOF
#!/bin/sh
exec node "$PREFIX/scripts/startup-update.mjs" "$PREFIX" "$CLI" "\$@"
EOF
chmod +x "$WRAPPER_TMP"
mv -f "$WRAPPER_TMP" "$BIN_DIR/eaon-code"
WRAPPER_TMP=

if ! "$BIN_DIR/eaon-code" --help >/dev/null 2>&1; then
  die "installed, but the CLI did not run"
fi

INSTALLED_COMMIT="$(git -C "$PREFIX" rev-parse HEAD)"
node - "$PREFIX" "$REPO" "$REF" "$BIN_DIR" "$INSTALLED_COMMIT" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [prefix, repo, ref, binDir, installedCommit] = process.argv.slice(2);
fs.writeFileSync(
  path.join(prefix, ".git", "eaon-code-install.json"),
  `${JSON.stringify({ kind: "eaon-code-source-install", schemaVersion: 1, repo, ref, binDir, installedCommit })}\n`,
);
NODE

echo "Eaon Code installed."
echo "  source:  $PREFIX"
echo "  command: $BIN_DIR/eaon-code"

if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
  echo ""
  echo "Add $BIN_DIR to your PATH:"
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
fi

cat <<'EOF'

Get started:
  export ANTHROPIC_API_KEY=sk-ant-...   # or another provider key
  eaon-code                             # start the interactive agent
EOF
