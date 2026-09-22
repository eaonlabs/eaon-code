# Changelog

## [Unreleased]

### Added

- Added transactional draft-state updates and array-reorder deltas for replicated Chord state.

### Fixed

- Avoided publishing a new state revision when a transaction restores the original value.
