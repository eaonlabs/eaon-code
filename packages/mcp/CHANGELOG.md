# Changelog

## [Unreleased]

### Added

- Added support for configured authorization-server metadata URLs and RFC 9207 issuer validation in MCP OAuth flows.

### Fixed

- Preserved granted scopes across authorization-code exchange, refresh, and step-up authorization; accepted empty pagination cursors and scope values from MCP servers.

## [1.0.7] - 2026-10-01

### Fixed

- Fall back to exponential retry delay when `Retry-After` headers contain non-finite values.

## [0.99.1] - 2026-09-29

## [0.99.0] - 2026-09-29

### Added

- Added a standalone MCP client with JSON-RPC lifecycle, tool discovery and calls, cancellation, progress, roots, stdio and Streamable HTTP transports, and an in-memory testing transport.
