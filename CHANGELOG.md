# Changelog

## Unreleased

### Added
- Track Price Guard calculation events via D1 `calculations` metric.
- Include `calculations` in `/report` output.
- Include `calculations` in scheduled Discord daily summary.

### Changed
- Migrate Price Guard ping from KV to D1.
- Add strict CORS handling to `/pg/ping` (OPTIONS + explicit origin allowlist).
