# Changelog

## [Unreleased]

### Fixed

- Validate codemode image output as base64 PNG, JPEG, GIF, or WebP and send the detected MIME type so malformed or mislabeled data does not poison later requests.

## [0.99.1] - 2026-09-29

## [0.99.0] - 2026-09-29

### Added

- Initial spike: `CodemodeSandbox` runs model-written JavaScript in a worker thread and exposes injected tools as `tools.<name>(args)` async functions.
