# Environment Variables

Eaon Code uses environment variables for process configuration, child-process detection, and shell-tool session metadata. New settings use the `EAON_CODE_*` prefix. Where noted, the old `PI_*` name remains accepted for existing scripts and installations.

Provider API-key variables are documented in [Providers](providers.md#environment-variables-or-auth-file).

## Process Markers

The CLI and RPC entry points set:

- `AI_AGENT=eaon-code` as the generic agent identifier.
- `EAON_CODE_CODING_AGENT=true` for Eaon Code-aware child processes.
- `PI_CODING_AGENT=true` as a legacy compatibility marker.

Child processes inherit these markers. They are not set automatically when Eaon Code is embedded through the SDK.

## Shell Tool Session Environment

Commands run by Eaon Code's built-in `bash` and `powershell` tools receive the current session metadata:

| Variable | Description |
|----------|-------------|
| `EAON_CODE_SESSION_ID` | Current session ID |
| `EAON_CODE_SESSION_FILE` | Absolute path to the current session JSONL file; unset for ephemeral sessions |
| `EAON_CODE_PROVIDER` | Currently selected model provider |
| `EAON_CODE_MODEL` | Currently selected model ID |
| `EAON_CODE_REASONING_LEVEL` | Current effective reasoning level |

The corresponding `PI_SESSION_ID`, `PI_SESSION_FILE`, `PI_PROVIDER`, `PI_MODEL`, and `PI_REASONING_LEVEL` variables are also set as legacy aliases. Values are resolved when each command starts, so switching models or reasoning levels affects the next command.

Custom tools created with `createBashTool()` or `createPowerShellTool()` expose the same metadata by default. Set `exposeSessionEnvironment: false` to remove inherited session values.

## Process Configuration

| Variable | Description |
|----------|-------------|
| `EAON_CODE_CODING_AGENT_DIR` | Override the user config directory (default: `~/.eaon/agent`); legacy alias: `PI_CODING_AGENT_DIR` |
| `EAON_CODE_CODING_AGENT_SESSION_DIR` | Override session storage; `--session-dir` takes precedence. Legacy alias: `PI_CODING_AGENT_SESSION_DIR` |
| `EAON_CODE_PACKAGE_DIR` | Override the package directory for Nix/Guix or other managed installs; legacy alias: `PI_PACKAGE_DIR` |
| `EAON_CODE_OFFLINE` | Disable startup network operations; legacy alias: `PI_OFFLINE` |
| `EAON_CODE_TELEMETRY` | Enable or disable optional provider-attribution headers; legacy alias: `PI_TELEMETRY` |
| `EAON_CODE_SHARE_VIEWER_URL` | Optional `/share` viewer base URL; legacy alias: `PI_SHARE_VIEWER_URL` |
| `EAON_CODE_SERVER_DIR`, `EAON_CODE_SERVER_ID` | Configure the source-only [experimental remote harness](development.md#experimental-remote-harness); legacy aliases: `PI_SERVER_DIR`, `PI_SERVER_ID` |
| `EAON_CODE_EXPERIMENTAL` | Enable source-only experimental CLI features; legacy alias: `PI_EXPERIMENTAL` |
| `PI_CACHE_RETENTION` | Legacy setting: use `long` for extended provider prompt caching where supported |
| `PI_RADIUS_GATEWAY` | Legacy override for the Radius gateway; its default remains part of the Radius integration |

Terminal compatibility overrides currently retain their `PI_*` names: `PI_HARDWARE_CURSOR`, `PI_HYPERLINKS`, `PI_IMAGE_PROTOCOL`, `PI_TRUE_COLOR`, and `PI_TUI_ESC_TIMEOUT`. See [Terminal setup](terminal-setup.md).

Provider credentials such as `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and cloud-provider configuration are listed in [Providers](providers.md#environment-variables-or-auth-file).
