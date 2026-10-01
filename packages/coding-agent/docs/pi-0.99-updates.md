# Eaon Code 1.0.6

Ports the core features and fixes from Pi 0.99.0 and 0.99.1. Existing Eaon providers, plan/swarm modes, BetterWright, subagents, and the dark-amber default remain available.

- Enable sandboxed JavaScript tool orchestration with `--tools +codemode` or `"defaultTools": ["+codemode"]` in settings. Codemode supports parallel calls and structured results. See [CLI tool options](usage.md#tool-options) and [MCP](mcp.md).
- Configure MCP stdio or streamable HTTP servers in `~/.eaon/agent/mcp.json` or trusted project `.eaon/mcp.json`. Use `/mcp` to manage connections and OAuth, or `eaon-code mcp add|remove|list|login|logout`. The existing settings-based MCP fallback remains when the built-in extension is disabled.
- Use `/login openai` for ChatGPT subscription sign-in. GPT-6.1 Sol is available on OpenAI, Azure OpenAI, and Codex; it is now the default Codex model. The bundled login module is included explicitly.
- Extensions can register virtual models, classifiers, tool exposure, nested calls, and provider stream events. See [Virtual models](virtual-models.md) and `examples/extensions/jev-router.ts`.
- Choose the optional `system` theme from `/settings`. It follows terminal palette changes; Eaon keeps its amber default and named presets. Themes support OKLCH/OKHSL, and fullscreen wheel scrolling has configurable acceleration.
- Includes session persistence, RPC input dispositions, provider reasoning/cache-price fixes, and streaming performance improvements.
