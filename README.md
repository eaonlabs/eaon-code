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
   ·
  <a href="mailto:mincoffical@eaon.dev">sanscreates@eaon.dev</a>
</p>

<p align="center">
  <a href="https://github.com/eaonlabs/eaon-code/actions"><img alt="CI" src="https://github.com/eaonlabs/eaon-code/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

Eaon Code is a full-screen coding agent for the terminal, with multi-provider model access, durable sessions, and an extension system for adapting it to a project or team.

## What Eaon Code includes

- **Plan mode** (`/plan`) restricts the agent to read-only exploration and shows a small mode indicator.
- **Swarm mode** (`/swarm`) makes the parent orchestrate 2–6 named specialist sub-agents in parallel, then reconcile and verify their work.
- **Observable sub-agents** run in isolated sessions with a persistent live activity view. Open `/agents` to inspect conversations, steer work, or press `x` twice to stop a run; completed results expand with Ctrl+O.
- **Eaon Plan** is a regular provider in the provider list. It is optional and does not override your selected provider or model.
- **Full-screen TUI by default**, with Amber as the default theme and separate dark- and light-theme lists in the theme picker and setup.
- **Eaon configuration paths** use `~/.eaon/agent` and project `.eaon/` directories. Existing `.pi` configuration directories remain usable as a compatibility path; Eaon Code does not move or delete them.

The core agent also includes file and shell tools, streaming responses, session branching and compaction, provider login and API-key auth, skills, prompts, extensions, themes, package management, and print/JSON/RPC/SDK interfaces.

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

The CLI command is `eaon-code`:

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
npm run build
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

New installs use `~/.eaon/agent/` for user settings, credentials, sessions, and resources, and `.eaon/` for project-local settings and resources. Existing `.pi` directories are still recognized when no corresponding `.eaon` directory exists, so upgrading does not strand or rewrite existing data.

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
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## License

MIT
