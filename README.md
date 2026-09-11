<p align="center">
  <a href="https://eaon.dev">
    <img alt="Eaon Code" src="https://avatars.githubusercontent.com/u/310382997?s=128&v=4" width="128">
  </a>
</p>

<p align="center">
  <strong>Eaon Code</strong>
  <br />
  Eaon's official coding agent — token-efficient, extensible, built for your terminal.
</p>

<p align="center">
  <a href="https://eaon.dev">eaon.dev</a>
  ·
  <a href="https://github.com/eaonlabs/eaon-code">GitHub</a>
  ·
  <a href="mailto:sanscreates@eaon.dev">sanscreates@eaon.dev</a>
</p>

<p align="center">
  <a href="https://github.com/eaonlabs/eaon-code/actions"><img alt="CI" src="https://github.com/eaonlabs/eaon-code/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

Eaon Code is a self-extensible coding agent CLI. It ships a minimal core — read, bash, edit, write, session management — and gets its workflow features from extensions and skills you install.

Built atop the [Pi agent harness](https://github.com/earendil-works/pi), retuned for Eaon: same proven runtime, branded and packaged for the Eaon ecosystem.

## Install

One line:

```bash
curl -fsSL https://raw.githubusercontent.com/eaonlabs/eaon-code/main/install.sh | bash
```

Or with npm:

```bash
npm install -g --ignore-scripts @eaonlabs/eaon-code
```

Requires Node.js ≥ 22.19.

The CLI is `eaon-code` (`pi` remains as an alias):

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # or another provider
eaon-code
```

Or launch and log in interactively:

```bash
eaon-code
/login
```

**Local run from a private clone** (no publish required):

```bash
git clone https://github.com/eaonlabs/eaon-code.git
cd eaon-code
npm install --ignore-scripts
./pi-test.sh --help
```

## Packages

| Package | Description |
|---------|-------------|
| **[@eaonlabs/eaon-code](packages/coding-agent)** | Interactive coding agent CLI |
| **[@eaonlabs/eaon-agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@eaonlabs/eaon-ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google, …) |
| **[@eaonlabs/eaon-tui](packages/tui)** | Terminal UI library with differential rendering |
| **[@eaonlabs/eaon-telemetry](packages/telemetry)** | Telemetry contracts, adapters, and typed schemas |
| **[@eaonlabs/chord](packages/chord)** | Application-composition runtime for services, RPC, and plugins |

Config still lives under `~/.pi` / `.pi/` for compatibility with existing installs.

## Permissions & containerization

Eaon Code does not include a built-in permission system for restricting filesystem, process, network, or credential access. By default it runs with the permissions of the user and process that launched it.

If you need stronger boundaries, containerize or sandbox it. See [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md) for three patterns:

- **Gondolin extension**: keep the agent and provider auth on the host while routing tools and `!` commands into a local Linux micro-VM.
- **Plain Docker**: run the whole process in a local container.
- **OpenShell**: run the whole process in a policy-controlled sandbox.

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build                 # Refresh model data, then build all packages
npm run build:offline         # Rebuild using existing model data without network access
npm run check                 # Lint, format, and type check
./test.sh                     # Run tests (skips LLM-dependent tests without API keys)
./pi-test.sh                  # Run the agent from sources (can be run from any directory)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## Upstream

Eaon Code is derived from [Pi](https://github.com/earendil-works/pi) by Mario Zechner / Earendil. Original copyright remains in [LICENSE](LICENSE). Thank you to the Pi maintainers.

## License

MIT
