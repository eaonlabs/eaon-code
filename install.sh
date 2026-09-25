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

# Lifecycle scripts are intentionally skipped — see README supply-chain notes.
npm install --ignore-scripts

echo "Building Eaon Code…"
# Build only what the CLI needs: deps first, then the coding agent bundle.
npm --prefix packages/chord run build
npm --prefix packages/tui run build
npm --prefix packages/telemetry run build

# Fresh source clones omit packages/ai/src/providers/data/. Seed that ignored
# generated data from the matching published package so an offline build does
# not need to contact every provider catalog. Validate the snapshot against the
# checked-out source; fall back to live generation only if it is unavailable or
# no longer matches this checkout.
AI_VERSION="$(node -p 'JSON.parse(require("node:fs").readFileSync("packages/ai/package.json", "utf8")).version')"
AI_SNAPSHOT_DIR="$(mktemp -d)"
trap 'rm -rf "$AI_SNAPSHOT_DIR"' EXIT
AI_TARBALL=""
if AI_TARBALL="$(npm pack "@eaonlabs/eaon-ai@$AI_VERSION" --silent --pack-destination "$AI_SNAPSHOT_DIR")"; then
  if tar -xzf "$AI_SNAPSHOT_DIR/$AI_TARBALL" -C "$AI_SNAPSHOT_DIR" package/dist/providers/data; then
    rm -rf packages/ai/src/providers/data
    mkdir -p packages/ai/src/providers/data
    cp -R "$AI_SNAPSHOT_DIR/package/dist/providers/data/." packages/ai/src/providers/data/
    if ! npm --prefix packages/ai run check:model-data; then
      echo "Published model data for @eaonlabs/eaon-ai@$AI_VERSION is stale; generating fresh catalogs from providers." >&2
      npm --prefix packages/ai run build
    else
      npm --prefix packages/ai run build:offline
    fi
  else
    echo "Could not extract published model data for @eaonlabs/eaon-ai@$AI_VERSION; generating fresh catalogs from providers." >&2
    npm --prefix packages/ai run build
  fi
else
  echo "Could not download published model data for @eaonlabs/eaon-ai@$AI_VERSION; generating fresh catalogs from providers." >&2
  npm --prefix packages/ai run build
fi
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
