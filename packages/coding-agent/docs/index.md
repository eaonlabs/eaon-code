# Eaon Code Documentation

Eaon Code is a full-screen terminal coding agent with Plan and Swarm modes, multi-provider model support, persistent sessions, and an extensible TypeScript runtime.

## Quick start

Install Eaon Code with npm:

```bash
npm install -g --ignore-scripts @eaonlabs/eaon-code
```

`--ignore-scripts` disables dependency lifecycle scripts during install. Eaon Code does not require install scripts for normal npm installs.

On Linux or macOS, you can also use the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/eaonlabs/eaon-code/main/install.sh | bash
```

To uninstall Eaon Code itself, use npm for curl and npm installs:

```bash
npm uninstall -g @eaonlabs/eaon-code
```

For pnpm, Yarn, or Bun installs, use the matching global remove command: `pnpm remove -g @eaonlabs/eaon-code`, `yarn global remove @eaonlabs/eaon-code`, or `bun uninstall -g @eaonlabs/eaon-code`.

Then run Eaon Code in a project directory:

```bash
eaon-code
```

Authenticate with `/login` for subscription providers, or set an API key such as `ANTHROPIC_API_KEY` before starting Eaon Code.

For the full first-run flow, see [Quickstart](quickstart.md).

## Start here

- [Quickstart](quickstart.md) - install, authenticate, and run a first session.
- [Using Eaon Code](usage.md) - interactive mode, slash commands, context files, and CLI reference.
- [Providers](providers.md) - subscription and API-key setup for built-in providers.
- [llama.cpp](llama-cpp.md) - run a local router and manage models with `/llama`.
- [Security](security.md) - project trust, sandbox boundaries, and vulnerability reporting.
- [Containerization](containerization.md) - sandbox Eaon Code with Gondolin, Docker, or OpenShell.
- [Settings](settings.md) - global and project settings.
- [Keybindings](keybindings.md) - default shortcuts and custom keybindings.
- [Sessions](sessions.md) - session management, branching, and tree navigation.
- [Compaction](compaction.md) - context compaction and branch summarization.

## Customization

- [Extensions](extensions.md) - TypeScript modules for tools, commands, events, and custom UI.
- [Skills](skills.md) - Agent Skills for reusable on-demand capabilities.
- [Prompt templates](prompt-templates.md) - reusable prompts that expand from slash commands.
- [Themes](themes.md) - built-in and custom terminal themes.
- [Eaon packages](packages.md) - bundle and share extensions, skills, prompts, and themes.
- [Custom models](models.md) - add model entries for supported provider APIs.
- [Custom providers](custom-provider.md) - implement custom APIs and OAuth flows.

## Programmatic usage

- [SDK](sdk.md) - embed Eaon Code in Node.js applications.
- [RPC mode](rpc.md) - integrate over stdin/stdout JSONL.
- [JSON event stream mode](json.md) - print mode with structured events.
- [TUI components](tui.md) - build custom terminal UI for extensions.

## Reference

- [Environment variables](environment-variables.md) - process configuration and session metadata available to shell tools.
- [Session format](session-format.md) - JSONL session file format, entry types, and SessionManager API.

## Platform setup

- [Windows](windows.md)
- [Termux on Android](termux.md)
- [tmux](tmux.md)
- [Terminal setup](terminal-setup.md)
- [Shell aliases](shell-aliases.md)

## Development

- [Development](development.md) - local setup, project structure, and debugging.
