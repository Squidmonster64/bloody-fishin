# Migration checklist and decision log

- [x] Verify main and deployed source SHA.
- [x] Clean install, baseline test/check/build.
- [x] Read principal merged PRs; locate named historical branches.
- [x] Preserve existing scoring authority and UI.
- [x] Add transport, cache validation, device location, sharing and spot transfer.
- [x] Demonstrate and correct stale-call and cross-timezone regressions in draft.
- [x] Fixed-fixture server/mobile scoring parity.
- [x] Generate traceable Floot import and transfer it.
- [x] Floot typecheck and deterministic helper suites.
- [ ] Approve proposed behaviour corrections and additive server release.
- [ ] Deploy /forecast after approval.
- [ ] Inspect all viewport sizes and accessibility targets.
- [ ] Real iPhone GPS success/denial/timeout, sharing and offline cold launch.
- [ ] Floot final build/preview gates.
- [ ] Confirm native-build allowance; user Publish → Mobile.

Decisions: reuse existing React; Railway remains server authority; generated source only for Floot; no independent scoring engine; preserve local storage identity; do not introduce custom service workers into Floot; no production change before approval.
