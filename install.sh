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
command -v npm >/dev/null 2>&1 || die "npm is required — install Node 22+, then re-run."

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
  git -C "$PREFIX" reset --hard "origin/$REF" -q
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
  if ! git -C "$PREFIX" restore -- packages/ai/src/models.generated.ts 'packages/ai/src/providers/*.models.ts'; then
    echo "eaon-code: could not restore generated model source files" >&2
    exit 1
  fi
  exit "$exit_status"
}
trap cleanup_build_generated_model_sources EXIT

# Lifecycle scripts are intentionally skipped — see README supply-chain notes.
npm install --ignore-scripts

echo "Building Eaon Code…"
# Build only what the CLI needs: deps first, then the coding agent bundle.
npm --prefix packages/chord run build
npm --prefix packages/tui run build
npm --prefix packages/telemetry run build
npm --prefix packages/ai run build:offline 2>/dev/null || npm --prefix packages/ai run build
npm --prefix packages/agent run build
npm --prefix packages/session-backends/sqlite-node run build
npm --prefix packages/protocol run build
npm --prefix packages/client run build
npm --prefix packages/server run build
npm --prefix packages/coding-agent run build

CLI="$AGENT_DIR/dist/bundle/cli.js"
[ -f "$CLI" ] || die "build finished but $CLI is missing"

mkdir -p "$BIN_DIR"
cat >"$BIN_DIR/eaon-code" <<EOF
#!/bin/sh
exec node "$CLI" "\$@"
EOF
chmod +x "$BIN_DIR/eaon-code"

if ! "$BIN_DIR/eaon-code" --help >/dev/null 2>&1; then
  die "installed, but the CLI did not run"
fi

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
