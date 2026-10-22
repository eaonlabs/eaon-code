# Changelog

## [Unreleased]

## [1.1.6] - 2026-10-22

### Fixed

- Included the Cloudflare and QuickJS ambient declarations in source builds so installer updates can compile the codemode package.

## [1.1.3] - 2026-10-16

### Added

- Added portable inline and remote codemode runtimes, including a Cloudflare Durable Object adapter.
- Added worker admission and lifecycle callbacks so hosts can bound live workers across sessions.

### Changed

- Added input constraints to tool declarations and elapsed time to codemode results.
- Described MCP tool results directly in the output schema.

### Fixed

- Made aborts and timeouts return promptly when a worker is running a non-interruptible built-in.
- Ignored Node watch-mode dependency reports on the codemode worker message channel.

## [1.1.0] - 2026-10-07

### Changed

- Marked text item boundaries and identified `console.*` output separately after returned content, so models can distinguish each source.

## [1.0.9] - 2026-10-06

### Added

- Limited script output to 16 Mi characters and 100,000 items to avoid unbounded output growth.

### Fixed

- Prevented scripts from changing JavaScript built-ins used to serialize codemode results.

## [1.0.8] - 2026-10-02

### Added

- Added image-model generation through the codemode runtime API.

### Changed

- Added actionable guidance for invalid model calls and clearer descriptions of script tool results.

## [1.0.7] - 2026-10-01

### Fixed

- Validate codemode image output as base64 PNG, JPEG, GIF, or WebP and send the detected MIME type so malformed or mislabeled data does not poison later requests.

## [0.99.1] - 2026-09-29

## [0.99.0] - 2026-09-29

### Added

- Initial spike: `CodemodeSandbox` runs model-written JavaScript in a worker thread and exposes injected tools as `tools.<name>(args)` async functions.
