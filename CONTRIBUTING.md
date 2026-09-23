# Contributing to Eaon Code

This guide exists to save both sides time.

## Philosophy

First things first: **Eaon Code's core is minimal**.

If your feature does not belong in the core, it should be an extension. PRs that bloat the core will likely be rejected.

The core exists to be minimal and extensible so that extensions can shape the agent. Even hook points for extensions should be well considered and discussed to avoid adding unmaintainable bloat and complex interactions.

## The One Rule

**You must understand your code.** If you cannot explain what your changes do and how they interact with the rest of the system, your PR will be closed.

Using AI to write code is fine. Submitting AI-generated slop without understanding it is not.

If you use an agent, run it from the repo root directory so it picks up `AGENTS.md` automatically. Your agent must follow the rules and guidelines in that file.

## Contribution Gate

All issues and PRs from new contributors are auto-closed by default.

Issues submitted Friday through Sunday are not guaranteed to be reviewed.  If something is urgent, email sanscreates@eaon.dev.

Maintainers review auto-closed issues daily and reopen worthwhile ones. Issues that do not meet the quality bar below will not be reopened or receive a reply.

Approval happens through maintainer replies on issues:

- `lgtmi`: your future issues will not be auto-closed
- `lgtm`: your future issues and PRs will not be auto-closed

The command must be at the start of the reply (optionally after one or more `@username` mentions) or at the end. `lgtmi` does not grant rights to submit PRs. Only `lgtm` grants rights to submit PRs.

## Quality Bar For Issues

If you open an issue, you must use one of the two GitHub issue templates.

If you open an issue, keep it short, concrete, and worth reading.

- Keep it concise. If it does not fit on one screen, it is too long.
- Write in your own voice (do not use an LLM to generate text, if you must, follow up with a clearly AI labeled comment).
- State the bug or request clearly.
- Explain why it matters.
- If you want to implement the change yourself, say so.

If the issue is real and written well, a maintainer may reopen it or reply with `lgtmi` or `lgtm` in the command position described above.

## Blocking

If you ignore this document twice, or if you spam the tracker with agent-generated issues, your GitHub account will be permanently blocked.

If you send a large volume of issues through automation, your GitHub account will be permanently blocked. No taksies backsies.

## Before Submitting a PR

Do not open a PR unless you have already been approved by a maintainer using `lgtm` in the command position described above.

Before submitting a PR:

```bash
npm run check
./test.sh
```

Both must pass.

Do not edit `CHANGELOG.md`. Changelog entries are added by maintainers.

If you are adding a new provider to `packages/ai`, see `AGENTS.md` for required tests.

## Releasing

After changes are committed and the working tree is clean, run one of:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

The release script updates every public workspace package to one shared version, refreshes release metadata, runs the repository checks/build/tests and consumer-install smoke test, then pushes the release commits and an `eaon-vX.Y.Z` tag to `main`. That tag runs `.github/workflows/eaon-release.yml`, which publishes the packages to npm with provenance and creates the matching GitHub Release. Do not use a `vX.Y.Z` tag; that prefix is reserved for the inherited Pi release workflow.

Before the first automated release, all public `@eaonlabs` packages must already exist on npm and each package must have a GitHub Actions trusted publisher configured for repository `eaonlabs/eaon-code` and workflow `eaon-release.yml`. Do not add a long-lived npm token to GitHub secrets. Initial package registration is a one-time manual publish; subsequent releases use GitHub's OIDC trusted publishing.

The release script refuses to run until every public package is registered on npm and the full test and smoke-test gates pass. Resolve any failing gate before tagging a release.

## Questions?

Email [sanscreates@eaon.dev](mailto:sanscreates@eaon.dev).

## FAQ

### Why are new issues and PRs auto-closed?

Eaon Code receives more issues than the maintainers can responsibly review in real time. Many reports do not meet the quality bar in this guide or do not follow CONTRIBUTING.md. Some are slung at the repository mindlessly via an agent instead of being reviewed and shaped by the person submitting them. Auto-closing creates a buffer so maintainers can review the tracker on their own schedule and reopen the issues that meet the quality bar.

### Why are weekend issues lower priority?

We triage the tracker during working hours. That means more issues can accumulate over the weekend. Anything submitted Friday through Sunday may be missed or given lower priority in the Monday review queue. If a problem is urgent, ask on Discord and include the short version, a repro, and the relevant logs.

### Why do some issues get no reply?

A reply is maintenance work too. Low-signal issues, unclear reports, duplicates, and issues that do not follow this guide may be closed without discussion. This keeps time available for reproducible bugs, thoughtful requests, and contributors who have done the work to make their report actionable.

### Why not let AI triage everything?

AI can help group duplicates, summarize reports, and spot missing information. It is not trusted to make final maintainer decisions. Polished AI-generated issues can still be wrong, misleading, or expensive to investigate. Human review remains the final gate.

### Is this hostile to contributors?

No. It is a guardrail against burnout and tracker spam. Short, concrete, reproducible issues are welcome. Thoughtful contributions are welcome. Automated slop, entitlement, and large volumes of low-effort reports are not.

## Where can I learn about plans?

Larger changes are discussed in GitHub issues and PRs on [eaonlabs/eaon-code](https://github.com/eaonlabs/eaon-code). Eaon Code is built atop [Pi](https://github.com/earendil-works/pi); upstream RFCs live at [rfc.earendil.com](https://rfc.earendil.com/keyword/pi/) and remain relevant for harness-level design.
