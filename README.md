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
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Requires Node.js ≥ 22.19.

The CLI binary is still named `pi` in this first pass (the install script also links `eaon-code`):

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # or another provider
pi
# or: eaon-code
```

Or launch and log in interactively:

```bash
pi
/login
```

## Packages

| Package | Description |
|---------|-------------|
| **[coding-agent](packages/coding-agent)** | Interactive coding agent CLI (product: Eaon Code) |
| **[pi-agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[pi-ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google, …) |
| **[pi-tui](packages/tui)** | Terminal UI library with differential rendering |
| **[pi-telemetry](packages/telemetry)** | Telemetry contracts, adapters, and typed schemas |
| **[chord](packages/chord)** | Application-composition runtime for services, RPC, and plugins |

> This first rebrand pass updates product name, docs, install, and repo metadata. Package IDs and the CLI binary (`pi`) still use upstream Pi identifiers so the monorepo keeps building; they will move under Eaon in a later pass.

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
