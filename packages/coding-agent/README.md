<p align="center">
  <a href="https://eaon.dev">
    <img alt="Eaon" src="https://avatars.githubusercontent.com/u/310382997?s=128&v=4" width="128">
  </a>
</p>
<p align="center">
  <strong>Eaon Code</strong> — Eaon's official coding agent
</p>
<p align="center">
  <a href="https://github.com/eaonlabs/eaon-code"><img alt="GitHub" src="https://img.shields.io/badge/github-eaonlabs%2Feaon--code-181717?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@eaonlabs/eaon-code"><img alt="npm" src="https://img.shields.io/npm/v/@eaonlabs/eaon-code?style=flat-square" /></a>
</p>

> New issues and PRs from new contributors are auto-closed by default. Maintainers review auto-closed issues daily. See [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

Eaon Code is Eaon's full-screen terminal coding agent. It combines a focused set of coding tools and persistent sessions with broad provider support and an extensible TypeScript runtime.

## What Eaon Code adds

- **Plan mode** (`/plan`) switches to read-only exploration and shows a small `plan` indicator while active.
- **Swarm mode** (`/swarm`) makes the parent orchestrate 2–6 named specialist sub-agents in parallel, then reconcile and verify their work.
- **Observable sub-agents** run in isolated sessions with a persistent live activity view. Open `/agents` to inspect conversations, steer work, or press `x` twice to stop a run; completed results expand with Ctrl+O.
- **Eaon Plan** is a regular provider alongside the others; it is not forced as the default or recommended provider.
- **Full-screen TUI by default**, with Amber as the default theme and separate dark and light theme lists in `/themes` and setup.
- **Eaon-branded configuration paths** use `~/.eaon/agent/` globally and `.eaon/` in projects. Existing `.pi` directories and package manifests remain readable as compatibility formats; data is not moved or deleted.

The agent also includes file, search, and shell tools; streaming responses; resumable, branchable JSONL sessions; context compaction; provider login and API-key authentication; and customization through extensions, skills, prompt templates, themes, and npm/git packages.

Use the interactive terminal UI, print mode, JSON event mode, RPC mode, or the TypeScript SDK. The package is `@eaonlabs/eaon-code` and the CLI command is `eaon-code`.

## Table of Contents

- [Quick Start](#quick-start)
- [Providers & Models](#providers--models)
- [Interactive Mode](#interactive-mode)
  - [Editor](#editor)
  - [Commands](#commands)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Message Queue](#message-queue)
- [Sessions](#sessions)
  - [Branching](#branching)
  - [Compaction](#compaction)
- [Settings](#settings)
- [Context Files](#context-files)
- [Customization](#customization)
  - [Prompt Templates](#prompt-templates)
  - [Skills](#skills)
  - [Extensions](#extensions)
  - [Themes](#themes)
  - [Eaon Packages](#eaon-packages)
- [Programmatic Usage](#programmatic-usage)
- [Philosophy](#philosophy)
- [CLI Reference](#cli-reference)

---

## Quick Start

One line (recommended):

```bash
curl -fsSL https://raw.githubusercontent.com/eaonlabs/eaon-code/main/install.sh | bash
```

Or with npm:

```bash
npm install -g --ignore-scripts @eaonlabs/eaon-code
```

`--ignore-scripts` disables dependency lifecycle scripts during install. Eaon Code does not require install scripts for normal npm installs.

Authenticate with an API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
eaon-code
```

Or use your existing subscription:

```bash
eaon-code
/login  # Then select provider
```

Then talk to Eaon Code. The built-in tools cover reading and editing files, shell commands, search, and file navigation. Add capabilities via [skills](#skills), [prompt templates](#prompt-templates), [extensions](#extensions), or [Eaon packages](#eaon-packages).

**Platform notes:** [Windows](docs/windows.md) | [Termux (Android)](docs/termux.md) | [tmux](docs/tmux.md) | [Terminal setup](docs/terminal-setup.md) | [Shell aliases](docs/shell-aliases.md)

---

## Providers & Models

Eaon Code includes tool-capable model catalogs for its built-in providers. Configured catalogs refresh automatically; run `eaon-code update --models` to force an immediate refresh. Authenticate via subscription (`/login`) or API key, then select a model via `/model` (or Ctrl+L). Press Ctrl+S in the model picker to save the highlighted model as the startup default.

**Subscriptions:**
- Anthropic Claude Pro/Max
- OpenAI ChatGPT Plus/Pro (Codex)
- GitHub Copilot

**API keys:**
- Anthropic
- Ant Ling
- OpenAI
- Azure OpenAI
- DeepSeek
- NVIDIA NIM
- Google Gemini
- Google Vertex
- Amazon Bedrock
- Mistral
- Groq
- Cerebras
- Cloudflare AI Gateway
- Cloudflare Workers AI
- xAI
- OpenRouter
- Vercel AI Gateway
- ZAI Coding Plan (Global)
- ZAI Coding Plan (China)
- OpenCode Zen
- OpenCode Go
- Hugging Face
- Fireworks
- Together AI
- Baseten
- Kimi For Coding
- MiniMax
- Xiaomi MiMo
- Xiaomi MiMo Token Plan (China)
- Xiaomi MiMo Token Plan (Amsterdam)
- Xiaomi MiMo Token Plan (Singapore)
- Eaon Plan

Eaon Plan is an optional provider; configure it with `EAON_API_KEY` or `/login eaon`. Eaon Code also supports the llama.cpp router server. Configure it with `/login llama.cpp`, manage downloads and loaded models with `/llama`, then select a loaded model with `/model`. See [docs/llama-cpp.md](docs/llama-cpp.md) for setup and usage.

See [docs/providers.md](docs/providers.md) for other provider setup instructions.

**Custom providers & models:** Add providers via `~/.eaon/agent/models.json` if they speak a supported API (OpenAI, Anthropic, Google). For custom APIs or OAuth, use extensions. See [docs/models.md](docs/models.md) and [docs/custom-provider.md](docs/custom-provider.md).

---

## Interactive Mode

<p align="center"><img src="docs/images/interactive-mode.png" alt="Interactive Mode" width="600"></p>

The interface from top to bottom:

- **Startup header** - Shows shortcuts (`/hotkeys` for all), loaded AGENTS.md files, prompt templates, skills, and extensions
- **Messages** - Your messages, assistant responses, tool calls and results, notifications, errors, and extension UI
- **Editor** - Where you type; border color indicates thinking level and the border shows the streaming working indicator
- **Footer** - Working directory, session name, total token/cache usage (`↑` input, `↓` output, `R` cache read, `W` cache write, `CH` latest cache hit rate), cost, context usage, current model. Totals include assistant responses, usage reported by tools, and summary generation.

The editor can be temporarily replaced by other UI, like built-in `/settings` or custom UI from extensions (e.g., a Q&A tool that lets the user answer model questions in a structured format). [Extensions](#extensions) can also replace the editor, add widgets above/below it, a status line, custom footer, or overlays.

### Editor

| Feature | How |
|---------|-----|
| File reference | Type `@` to fuzzy-search project files |
| Path completion | Tab to complete paths |
| Multi-line | Shift+Enter (or Ctrl+Enter on Windows Terminal) |
| External editor | Ctrl+G opens `externalEditor`, `$VISUAL`, `$EDITOR`, Notepad on Windows, or `nano` elsewhere |
| Clipboard | Ctrl+V to paste an image or text (Alt+V on Windows), or drag images onto terminal |
| Bash commands | `!command` runs and sends output to LLM, `!!command` runs without sending |

Standard editing keybindings for delete word, undo, etc. See [docs/keybindings.md](docs/keybindings.md).

### Commands

Type `/` in the editor to trigger commands. [Extensions](#extensions) can register custom commands, [skills](#skills) are available as `/skill:name`, and [prompt templates](#prompt-templates) expand via `/templatename`.

| Command | Description |
|---------|-------------|
| `/login`, `/logout` | Manage provider credentials |
| [`/llama`](docs/llama-cpp.md) | Download, load, and unload llama.cpp router models |
| `/model` | Switch models; Ctrl+S in the picker saves the startup default |
| `/thinking` | Switch thinking level; Ctrl+S in the picker saves the startup default |
| `/scoped-models` | Enable/disable models for Ctrl+P cycling |
| `/settings` | Theme, message delivery, transport, and other preferences |
| `/resume` | Pick from previous sessions |
| `/new` | Start a new session |
| `/name <name>` | Set session display name |
| `/session` | Show session info (file, ID, messages, tokens, cost) |
| `/tree` | Jump to any point in the session and continue from there |
| `/trust` | Save project trust decision for future sessions (restart required) |
| `/fork` | Create a new session from a previous user message |
| `/clone` | Duplicate the current active branch into a new session |
| `/compact [prompt]` | Manually compact context, optional custom instructions |
| `/copy` | Copy last assistant message to clipboard |
| `/export [file]` | Export session to HTML or JSONL file |
| `/import <file>` | Import and resume a session from a JSONL file |
| `/share` | Upload as private GitHub gist with shareable HTML link |
| `/reload` | Reload keybindings, extensions, skills, prompts, themes, and context files |
| `/hotkeys` | Show all keyboard shortcuts |
| `/changelog` | Display version history |
| `/quit` | Quit Eaon Code |

### Keyboard Shortcuts

See `/hotkeys` for the full list. Customize via `~/.eaon/agent/keybindings.json`. See [docs/keybindings.md](docs/keybindings.md).

**Commonly used:**

| Key | Action |
|-----|--------|
| Ctrl+C | Clear editor |
| Ctrl+C twice | Quit |
| Escape | Cancel/abort |
| Escape twice | Open `/tree` |
| Ctrl+L | Open model selector |
| Ctrl+P / Shift+Ctrl+P | Cycle scoped models forward/backward |
| Shift+Tab | Cycle thinking level |
| Ctrl+O | Collapse/expand tool output |
| Ctrl+T | Collapse/expand thinking blocks |
| Ctrl+X | Copy the last assistant message; with fullscreen copy-on-select disabled, copy the active text selection |

### Message Queue

Submit messages while the agent is working:

- **Enter** queues a *steering* message, delivered after the current assistant turn finishes executing its tool calls
- **Alt+Enter** queues a *follow-up* message, delivered only after the agent finishes all work
- **Escape** aborts and restores queued messages to editor
- **Alt+Up** retrieves queued messages back to editor

On Windows Terminal, `Alt+Enter` is fullscreen by default. Remap it in [docs/terminal-setup.md](docs/terminal-setup.md) so Eaon Code can receive the follow-up shortcut.

Configure delivery in [settings](docs/settings.md): `steeringMode` and `followUpMode` can be `"one-at-a-time"` (default, waits for response) or `"all"` (delivers all queued at once). `transport` selects provider transport preference (`"sse"`, `"websocket"`, or `"auto"`) for providers that support multiple transports.

---

## Sessions

Sessions are stored as JSONL files with a tree structure. Each entry has an `id` and `parentId`, enabling in-place branching without creating new files. See [docs/session-format.md](docs/session-format.md) for file format.

### Management

Sessions auto-save to `~/.eaon/agent/sessions/` organized by working directory.

```bash
eaon-code -c                  # Continue most recent session
eaon-code -r                  # Browse and select from past sessions
eaon-code --no-session        # Ephemeral mode (don't save)
eaon-code --name "my task"    # Set session display name at startup
eaon-code --session <path|id> # Use specific session file or ID
eaon-code --fork <path|id>    # Fork specific session file or ID into a new session
```

Use `/session` in interactive mode to see the current session ID before reusing it with `--session <id>` or `--fork <id>`.

### Branching

**`/tree`** - Navigate the session tree in-place. Select any previous point, continue from there, and switch between branches. All history preserved in a single file. Selecting a point while the model is responding cancels that response. Navigation cannot proceed while compaction or another tree navigation is still running; wait for it to finish and retry.

<p align="center"><img src="docs/images/tree-view.png" alt="Tree View" width="600"></p>

- Search by typing, fold/unfold and jump between branches with Ctrl+←/Ctrl+→ or Alt+←/Alt+→, page with ←/→
- Filter modes (Ctrl+O): default → no-tools → user-only → labeled-only → all
- Press Ctrl+X to copy the selected message
- Press Shift+L to label entries as bookmarks and Shift+T to toggle label timestamps

**`/fork`** - Create a new session file from a previous user message on the active branch. Opens a selector, copies the active path up to that point, and places the selected prompt in the editor for modification.

**`/clone`** - Duplicate the current active branch into a new session file at the current position. The new session keeps the full active-path history and opens with an empty editor.

**`--fork <path|id>`** - Fork an existing session file or partial session UUID directly from the CLI. This copies the full source session into a new session file in the current project.

### Compaction

Long sessions can exhaust context windows. Compaction summarizes older messages while keeping recent ones.

**Manual:** `/compact` or `/compact <custom instructions>`

**Automatic:** Enabled by default. Triggers on context overflow (recovers and retries) or when approaching the limit (proactive). Configure via `/settings` or `settings.json`.

Compaction is lossy. The full history remains in the JSONL file; use `/tree` to revisit. Customize compaction behavior via [extensions](#extensions). See [docs/compaction.md](docs/compaction.md) for internals.

---

## Settings

Use `/settings` to modify common options, or edit JSON files directly:

| Location | Scope |
|----------|-------|
| `~/.eaon/agent/settings.json` | Global (all projects) |
| `.eaon/settings.json` | Project (overrides global) |

See [docs/settings.md](docs/settings.md) for all options.

### Project Trust

On interactive startup, Eaon Code asks before trusting a project folder that contains project-local settings, resources, or project `.agents/skills` and has no saved decision for the folder or a parent folder in `~/.eaon/agent/trust.json`. Trusting a project allows Eaon Code to load `.eaon/` resources (or an existing legacy `.pi/` directory), install missing project packages, and execute project extensions.

Before the trust decision, Eaon Code loads only context files, user/global extensions, and CLI `-e` extensions so they can handle the `project_trust` event. Project-local extensions, project package-managed extensions, and project settings are loaded only after the project is trusted. This split also applies when switching to a session from a different cwd whose trust has not been resolved in the current process.

Non-interactive modes (`-p`, `--mode json`, and `--mode rpc`) do not show a trust prompt. Without an applicable saved trust decision, they use `defaultProjectTrust` from global settings: `ask` (default) and `never` ignore those project resources, while `always` trusts them. Pass `--approve`/`-a` or `--no-approve`/`-na` to override project trust for one run.

If no extension or saved decision applies, `defaultProjectTrust` controls the fallback behavior. Set it to `"ask"`, `"always"`, or `"never"` in `~/.eaon/agent/settings.json`, or change it with `/settings`.

`eaon-code config` and package commands use the same project trust flow, except `eaon-code update` never prompts. Pass `--approve` to trust project-local settings for one command or `--no-approve` to ignore them.

Use `/trust` in interactive mode to save a project trust decision for future sessions, including trust for the immediate parent folder. It writes `~/.eaon/agent/trust.json` only; the current session is not reloaded, so restart Eaon Code for changes to take effect.

### Telemetry and update checks

The optional version check reads package metadata from the npm registry for `@eaonlabs/eaon-code`; the `eaon-code update` command uses the same release source. Disable the check with `EAON_CODE_SKIP_VERSION_CHECK=1`. Eaon Code does not send install or update pings. Provider-attribution headers are off by default and can be controlled with `enableInstallTelemetry` or `EAON_CODE_TELEMETRY`. Use `--offline` or `EAON_CODE_OFFLINE=1` to disable startup network operations, including version and package update checks.

---

## Context Files

Eaon Code loads `AGENTS.md` (or `CLAUDE.md`) at startup from:
- `~/.eaon/agent/AGENTS.md` (global)
- Parent directories (walking up from cwd)
- Current directory

If a directory contains `AGENTS.override.md`, Eaon Code loads it instead of `AGENTS.md` or `CLAUDE.md` from that directory. Context files from other directories are still concatenated.

Use for project instructions (`AGENTS.md`/`CLAUDE.md`), conventions, common commands. All matching files are concatenated.

Disable context file loading with `--no-context-files` (or `-nc`).

### System Prompt

Replace the default system prompt with `.eaon/SYSTEM.md` (project) or `~/.eaon/agent/SYSTEM.md` (global). Append without replacing via `APPEND_SYSTEM.md`.

---

## Customization

### Prompt Templates

Reusable prompts as Markdown files. Type `/name` to expand.

```markdown
<!-- ~/.eaon/agent/prompts/review.md -->
Review this code for bugs, security issues, and performance problems.
Focus on: {{focus}}
```

Place in `~/.eaon/agent/prompts/`, `.eaon/prompts/`, or an [Eaon package](#eaon-packages) to share with others. See [docs/prompt-templates.md](docs/prompt-templates.md).

### Skills

On-demand capability packages following the [Agent Skills standard](https://agentskills.io). Invoke via `/skill:name` or let the agent load them automatically.

```markdown
<!-- ~/.eaon/agent/skills/my-skill/SKILL.md -->
# My Skill
Use this skill when the user asks about X.

## Steps
1. Do this
2. Then that
```

Place in `~/.eaon/agent/skills/`, `~/.agents/skills/`, `.eaon/skills/`, or `.agents/skills/` (from `cwd` up through parent directories) or an [Eaon package](#eaon-packages) to share with others. See [docs/skills.md](docs/skills.md).

### Extensions

<p align="center"><img src="docs/images/doom-extension.png" alt="Doom Extension" width="600"></p>

TypeScript modules that extend Eaon Code with custom tools, commands, keyboard shortcuts, event handlers, and UI components.

```typescript
export default function (api: ExtensionAPI) {
  api.registerTool({ name: "deploy", ... });
  api.registerCommand("stats", { ... });
  api.on("tool_call", async (event, ctx) => { ... });
}
```

The default export can also be `async`. Eaon Code waits for async extension factories before startup continues, which is useful for one-time initialization such as fetching remote model lists before calling `api.registerProvider()`.

**What's possible:**
- Custom tools (or replace built-in tools entirely)
- Custom multi-agent workflows alongside built-in Plan and Swarm modes
- Custom compaction and summarization
- Permission gates and path protection
- Custom editors and UI components
- Status lines, headers, footers
- Git checkpointing and auto-commit
- SSH and sandbox execution
- MCP server integration
- Customize Eaon Code's interface and workflow
- Games while waiting (yes, Doom runs)
- ...anything you can dream up

Place in `~/.eaon/agent/extensions/`, `.eaon/extensions/`, or an [Eaon package](#eaon-packages) to share with others. See [docs/extensions.md](docs/extensions.md) and [examples/extensions/](examples/extensions/).

### Themes

Amber is the default. Choose from separate dark and light theme lists in `/themes`; custom themes hot-reload when edited.

Place in `~/.eaon/agent/themes/`, `.eaon/themes/`, or an [Eaon package](#eaon-packages) to share with others. See [docs/themes.md](docs/themes.md).

### Eaon Packages

Bundle and share extensions, skills, prompts, and themes via npm or git.

> **Security:** Packages run with the current user's permissions. Extensions execute code, and skills can instruct the model to perform actions including running executables. Review third-party packages before installing them.

```bash
eaon-code install npm:@foo/eaon-tools
eaon-code install npm:@foo/eaon-tools@1.2.3      # pinned version
eaon-code install git:github.com/user/repo
eaon-code install git:github.com/user/repo@v1  # tag or commit
eaon-code install git:git@github.com:user/repo
eaon-code install git:git@github.com:user/repo@v1  # tag or commit
eaon-code install https://github.com/user/repo
eaon-code install https://github.com/user/repo@v1      # tag or commit
eaon-code install ssh://git@github.com/user/repo
eaon-code install ssh://git@github.com/user/repo@v1    # tag or commit
eaon-code remove npm:@foo/eaon-tools
eaon-code uninstall npm:@foo/eaon-tools          # alias for remove
eaon-code list
eaon-code update                               # update Eaon Code
eaon-code update --all                         # update Eaon Code and packages
eaon-code update --extensions                  # update packages only
eaon-code update --models                      # refresh model catalogs only
eaon-code update --self                        # update Eaon Code
eaon-code update --self --force                # reinstall Eaon Code even if current
eaon-code update npm:@foo/eaon-tools           # update one package
eaon-code config                               # enable/disable extensions, skills, prompts, themes
```

Packages install to `~/.eaon/agent/git/` (git) or `~/.eaon/agent/npm/` (npm). Use `-l` for project-local installs (`.eaon/git/`, `.eaon/npm/`). Git `@ref` values are pinned tags or commits; pinned packages are skipped by `eaon-code update --extensions` and `eaon-code update --all`, so use `eaon-code install git:host/user/repo@new-ref` to move an existing package to a new ref. Git packages install dependencies with `npm install --omit=dev` by default, so runtime dependencies must be listed under `dependencies`; when `npmCommand` is configured, git packages use plain `install` for compatibility with wrappers. If you use a Node version manager and want package installs to reuse a stable npm context, set `npmCommand` in `settings.json`, for example `["mise", "exec", "node@20", "--", "npm"]`.

Create a package by adding an `eaon` key to `package.json`:

```json
{
	"name": "my-eaon-package",
	"eaon": {
		"extensions": ["./extensions"],
		"skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

The legacy `pi` manifest key is still read for compatibility. Without either manifest, Eaon Code auto-discovers conventional directories (`extensions/`, `skills/`, `prompts/`, `themes/`).

See [docs/packages.md](docs/packages.md).

---

## Programmatic Usage

### SDK

```typescript
import { createAgentSession, ModelRuntime, SessionManager } from "@eaonlabs/eaon-code";

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime,
});

await session.prompt("What files are in the current directory?");
```

For advanced multi-session runtime replacement, use `createAgentSessionRuntime()` and `AgentSessionRuntime`.

See [docs/sdk.md](docs/sdk.md) and [examples/sdk/](examples/sdk/).

### RPC Mode

For non-Node.js integrations, use RPC mode over stdin/stdout:

```bash
eaon-code --mode rpc
```

RPC mode uses strict LF-delimited JSONL framing. Clients must split records on `\n` only. Do not use generic line readers like Node `readline`, which also split on Unicode separators inside JSON payloads.

See [docs/rpc.md](docs/rpc.md) for the protocol.

---

## Philosophy

Eaon Code keeps workflows configurable: Plan and Swarm are opt-in, MCP connections are user-configured, and extensions can add tools, interfaces, or policy that fits your environment. The agent runs with the permissions of its process; use a container or operating-system sandbox when stronger isolation is required.

---

## CLI Reference

```bash
eaon-code [options] [--] [@files...] [messages...]
```

### Package Commands

```bash
eaon-code install <source> [-l]     # Install package, -l for project-local
eaon-code remove <source> [-l]      # Remove package
eaon-code uninstall <source> [-l]   # Alias for remove
eaon-code update [source|self]      # Update Eaon Code or one package source
eaon-code update --all              # Update Eaon Code and packages
eaon-code update --extensions       # Update packages only
eaon-code update --models           # Refresh model catalogs only
eaon-code update --self             # Update Eaon Code
eaon-code update --self --force     # Reinstall Eaon Code even if current
eaon-code update --extension <src>  # Update one package
eaon-code list                      # List installed packages
eaon-code config                    # Enable/disable package resources
```

`eaon-code config` and project package commands accept `--approve`/`--no-approve` to trust or ignore project-local settings for one command. `eaon-code update` never prompts for project trust.

### Modes

| Flag | Description |
|------|-------------|
| (default) | Interactive mode |
| `-p`, `--print` | Print response and exit |
| `--mode json` | Output all events as JSON lines (see [docs/json.md](docs/json.md)) |
| `--mode rpc` | RPC mode for process integration (see [docs/rpc.md](docs/rpc.md)) |
| `--export <in> [out]` | Export session to HTML |

In print mode, Eaon Code also reads piped stdin and merges it into the initial prompt:

```bash
cat README.md | eaon-code -p "Summarize this text"
```

### Model Options

| Option | Description |
|--------|-------------|
| `--provider <name>` | Provider (anthropic, openai, google, etc.) |
| `--model <pattern>` | Model pattern or ID (supports `provider/id` and optional `:<thinking>`) |
| `--api-key <key>` | API key (overrides env vars) |
| `--thinking <level>` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` |
| `--models <patterns>` | Comma-separated patterns for Ctrl+P cycling |
| `--list-models [search]` | List available models |

### Session Options

| Option | Description |
|--------|-------------|
| `-c`, `--continue` | Continue most recent session |
| `-r`, `--resume` | Browse and select session |
| `--session <path\|id>` | Use specific session file or partial UUID |
| `--fork <path\|id>` | Fork specific session file or partial UUID into a new session |
| `--session-dir <dir>` | Custom session storage directory |
| `--no-session` | Ephemeral mode (don't save) |
| `--name <name>`, `-n <name>` | Set session display name at startup |

### Tool Options

| Option | Description |
|--------|-------------|
| `--tools <list>`, `-t <list>` | Allowlist specific tool names across built-in, extension, and custom tools |
| `--exclude-tools <list>`, `-xt <list>` | Disable specific tool names across built-in, extension, and custom tools |
| `--no-builtin-tools`, `-nbt` | Disable built-in tools by default but keep extension/custom tools enabled |
| `--no-tools`, `-nt` | Disable all tools by default |

Available built-in tools: `read`, `bash`, `powershell` (Windows), `edit`, `write`, `grep`, `find`, `ls`

### Resource Options

| Option | Description |
|--------|-------------|
| `-e`, `--extension <source>` | Load extension from path, npm, or git (repeatable) |
| `--no-extensions` | Disable extension discovery |
| `--skill <path>` | Load skill (repeatable) |
| `--no-skills` | Disable skill discovery |
| `--prompt-template <path>` | Load prompt template (repeatable) |
| `--no-prompt-templates` | Disable prompt template discovery |
| `--theme <path>` | Load theme (repeatable) |
| `--no-themes` | Disable theme discovery |
| `--no-context-files`, `-nc` | Disable AGENTS.md and CLAUDE.md context file discovery |

Combine `--no-*` with explicit flags to load exactly what you need, ignoring settings.json (e.g., `--no-extensions -e ./my-ext.ts`).

### Other Options

| Option | Description |
|--------|-------------|
| `--system-prompt <text>` | Replace default prompt (context files and skills still appended) |
| `--append-system-prompt <text>` | Append to system prompt |
| `--tui-mode <mode>` | TUI mode: `fullscreen` (default) or `regular` |
| `--use-theme <name[/name]>` | Set the initial interactive theme for this run without changing settings |
| `--verbose` | Force verbose startup |
| `-a`, `--approve` | Trust project-local files for this run |
| `-na`, `--no-approve` | Ignore project-local files for this run |
| `--` | Stop option parsing; remaining arguments are prompts or `@file` inputs |
| `-h`, `--help` | Show help |
| `-v`, `--version` | Show version |

### File Arguments

Prefix files with `@` to include in the message:

```bash
eaon-code @prompt.md "Answer this"
eaon-code -p @screenshot.png "What's in this image?"
eaon-code @code.ts @test.ts "Review these files"
```

### Examples

```bash
# Interactive with initial prompt
eaon-code "List all .ts files in src/"

# Non-interactive
eaon-code -p "Summarize this codebase"

# Prompt beginning with a dash
eaon-code -p -- "- Summarize these points"

# Non-interactive with piped stdin
cat README.md | eaon-code -p "Summarize this text"

# Named one-shot session
eaon-code --name "release audit" -p "Audit this repository"

# Different model
eaon-code --provider openai --model gpt-4o "Help me refactor"

# Model with provider prefix (no --provider needed)
eaon-code --model openai/gpt-4o "Help me refactor"

# Model with thinking level shorthand
eaon-code --model sonnet:high "Solve this complex problem"

# Limit model cycling
eaon-code --models "claude-*,gpt-4o"

# Read-only mode
eaon-code --tools read,grep,find,ls -p "Review the code"

# Disable one extension or built-in tool while keeping the rest available
eaon-code --exclude-tools ask_question

# High thinking level
eaon-code --thinking high "Solve this complex problem"
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AI_AGENT` | Set to `eaon-code` by the CLI and RPC entry points |
| `EAON_CODE_CODING_AGENT` | Set to `true` so child processes can detect that they run inside Eaon Code; `PI_CODING_AGENT` is also set for compatibility |
| `EAON_CODE_CODING_AGENT_DIR` | Override the config directory (default: `~/.eaon/agent`; legacy: `PI_CODING_AGENT_DIR`) |
| `EAON_CODE_CODING_AGENT_SESSION_DIR` | Override session storage (overridden by `--session-dir`; legacy: `PI_CODING_AGENT_SESSION_DIR`) |
| `EAON_CODE_PACKAGE_DIR` | Override the package directory for Nix/Guix or other managed installs (legacy: `PI_PACKAGE_DIR`) |
| `EAON_CODE_OFFLINE` | Disable startup network operations, including version and package update checks (legacy: `PI_OFFLINE`) |
| `EAON_CODE_SKIP_VERSION_CHECK` | Skip the npm-registry version check at startup (legacy: `PI_SKIP_VERSION_CHECK`) |
| `EAON_CODE_TELEMETRY` | Control optional provider-attribution headers with `1`/`true`/`yes` or `0`/`false`/`no` (legacy: `PI_TELEMETRY`) |
| `EAON_CODE_SHARE_VIEWER_URL` | Optional base URL for `/share`; by default it opens the GitHub Gist directly (legacy: `PI_SHARE_VIEWER_URL`) |
| `PI_CACHE_RETENTION` | Legacy setting: set to `long` for extended prompt cache (Anthropic: 1h, OpenAI: 24h) |
| `VISUAL`, `EDITOR` | Fallback external editor for Ctrl+G when `externalEditor` is unset; defaults to Notepad on Windows and `nano` elsewhere |

Commands run by the LLM-callable `bash` and `powershell` tools also receive current session metadata:

| Variable | Description |
|----------|-------------|
| `EAON_CODE_SESSION_ID` | Current session ID (`PI_SESSION_ID` compatibility alias) |
| `EAON_CODE_SESSION_FILE` | Absolute session JSONL path; unset for ephemeral sessions (`PI_SESSION_FILE` alias) |
| `EAON_CODE_PROVIDER` | Currently selected model provider (`PI_PROVIDER` alias) |
| `EAON_CODE_MODEL` | Currently selected model ID (`PI_MODEL` alias) |
| `EAON_CODE_REASONING_LEVEL` | Current effective reasoning level (`PI_REASONING_LEVEL` alias) |

These values are resolved when each command starts. See [Environment Variables](docs/environment-variables.md#shell-tool-session-environment) for semantics, examples, and custom-tool opt-out.

---

## Contributing & Development

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines and [docs/development.md](docs/development.md) for setup, forking, and debugging.

## License

MIT

## See Also

- [@eaonlabs/eaon-ai](https://www.npmjs.com/package/@eaonlabs/eaon-ai): Core LLM toolkit
- [@eaonlabs/eaon-agent-core](https://www.npmjs.com/package/@eaonlabs/eaon-agent-core): Agent framework
- [@eaonlabs/eaon-tui](https://www.npmjs.com/package/@eaonlabs/eaon-tui): Terminal UI components
