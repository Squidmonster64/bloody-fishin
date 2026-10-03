# Read-only hourly export for the private Weekbook

The default `/brief.json?spot=freo&days=14` returns a 36-hour preview, which cannot supply the selected Monday–Sunday five-rows-per-day Weekbook. This change adds an opt-in `hours=all` query while retaining the default preview, scoring, provider requests, rate limit and existing cache behaviour. The cache key already includes every sorted query parameter.

Proposed source URL after a separately authorised release:

`https://weather.bloodydaves.com/brief.json?spot=freo&days=14&hours=all`

At most 336 future hourly records are returned. Missing marine fields remain null, with the existing marine availability notes; daily ranges are never converted into fabricated hourly values. Only `preview` and `all` are accepted. The private suite checks location, timezone and all 35 requested date/time identities before taking a snapshot. A missing day remains a hard source failure.

This is a source-only dependency for the private NAS review branch in `Squidmonster64/hope-johnstone-suite` PR #20. No production deployment, domain change or automation change is authorised by this PR. Until this export is actually released and read-only coverage is verified, complete live Weekbook generation remains blocked. Current Sunday 17:00 Australia/Perth generation stays active.

Verification obtained in the preparation workspace: Vitest 2.1.9, `vitest run server/briefing.test.ts --maxWorkers=1 --minWorkers=1`, 11/11 tests pass. The representative seven-day fixture verifies 168 exported hourly records, unchanged default 36-row output and daily summaries, exact first-row parity, final-day null preservation and invalid-option rejection. This is a mocked provider test, not a claim of live release. Other repository tests and production deployment were not run here.
