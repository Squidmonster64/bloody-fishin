# Fix plan: Bloody Dave's Boating / Bloody Fishin (Perth waters)

Prepared 14 November 2026 (AWST). Read-only. No code, branch, PR, deployment, DNS, account or schedule was changed. No one was contacted.

This plan turns the two reviews of 12 November into ordered task cards for a coding agent (Cline). The owner has decided to fix the pilot. This plan does not revisit that decision.

Labels: **[M]** verified by me in the code or on the live staging feed on 14 Nov 2026. **[R]** taken from the reviews, not re-checked. **[J]** judgement. Every number marked [J] is a proposal for skipper validation, not a safety standard.

Code base for all cards: repo `Squidmonster64/bloody-fishin`, branch `codex/cloudflare-worker`, head `93078fcd6baf24491a1ae512b87174d1148a6061` (17 Oct 2026). The head has **not** moved since the reviews [M]. Line numbers in the cards refer to that commit.

Every card ends with the same rule: **deploy only with the owner's explicit approval.**

---

## 1. Headline problems, verified against code

| # | Problem | Verified | Evidence (file:line at `93078fc`) |
|---|---|---|---|
| 1 | No route, leg or return-leg logic | [M] | `rateSL20` takes one hour of one point (`shared/scoring.ts:23-31`). `forecast()` fetches one location (`server/briefing.ts:201-216`). No route type or table exists anywhere in `shared/`, `server/` or `client/src/lib/`. |
| 2 | Wind direction unused in ratings | [M] | Direction is fetched (`server/briefing.ts:214`) and stored (`:245`). It is not a parameter of `rateSL20` (`shared/scoring.ts:23-31`) and is not read in `eligible` (`server/briefing.ts:168-179`) or `meetsCriteria` (`client/src/lib/sickieCriteria.ts:74-87`). It is display only. |
| 3 | Hourly label and vessel window disagree | [M] | Label: Go below 15 kt, gust below 21 kt (`shared/scoring.ts:52-61`). Default window: wind ≤10, gust ≤14, swell ≤0.99, rain 0%, 4 stars, 3 h (`server/briefing.ts:72`, `client/src/lib/sickieCriteria.ts:49`). Live 15 Nov at Fremantle: 11 daylight hours "Go", zero windows [M]. |
| 3a | There are three window builders and eleven label call sites | [M] new | Windows: `makeWindows` (`server/briefing.ts:181-199`), `buildWindows` (`client/src/components/SickieView.tsx:37-62`), `buildChronologicalWindows` (`client/src/lib/decisionBrief.ts:173-189`). The client never reads the server's `nextWindows` (`client/src/lib/forecastApi.ts:52-63`). `rateSL20` is called directly at `server/briefing.ts:270,293`, `decisionBrief.ts:146,325`, `DecisionView.tsx:56,194`, `SickieView.tsx:77,406`, `TableView.tsx:16`, `SummaryView.tsx:25,48`, `GraphView.tsx:324`. |
| 4 | Default window gated by 4-star fishing | [M] | `server/briefing.ts:72` (`minStars: 4`) and `:174`. Client: `sickieCriteria.ts:49` and `:80`. Next-usable window: `decisionBrief.ts:135`. |
| 5 | Long-period swell never downgrades | [M] | Swell only appears in rules that need period < 8 s or < 10 s (`shared/scoring.ts:52,55`). Total wave height is read only to infer chop (`:37,46`). 4 m at 14 s with 10 kt rates "Go" by reading the code. |
| 6 | "Go" shown at night | [M] | `rateSL20` has no daylight input. `serializeHour` emits the label for every hour (`server/briefing.ts:369`). `assessGoNoGo` and `buildHeadline` have no daylight test (`decisionBrief.ts:214-221,239-243`). The client row type has no daylight field at all (`fishingEngine.ts:51-79`; `forecastApi.ts:88-126` drops it). Live: Fremantle 15 Nov 00:00 to 05:00 all "Go", `daylight: false` [M]. |
| 7 | BOM wind warnings not read | [M] | The parser keeps winds, seas, swell, weather and one flag, `thunderstorm` (`server/officialMarine.ts:27`). Nothing matches the word "warning". |
| 7a | Rottnest outside the BOM box | [M] | Box west edge is 115.55 (`shared/officialMarine.ts:18-20`). Thomson Bay in the app's own list is 115.543 (`fishingEngine.ts:154`). All five Rottnest spots (`:154-158`) fall outside. |
| 8 | Model spread hidden | [M] | One wind request, no `models` parameter (`server/briefing.ts:214`). One marine request (`:216`). One value per field is shown. |
| 9 | Thresholds uniform across spot, direction and lead time | [M] | `rateSL20` has no location, direction or lead-time input. The same function rates Cockburn Sound and "Maldives (Male)" (`fishingEngine.ts:149,189`). |
| 10 | Missing wind or gust rates as calm | [M] | `shared/scoring.ts:33-34` turns null into 0. A test pins "Excellent" for all-null marine (`shared/scoring.test.ts:55-58`). Client `meetsCriteria` passes null wind, swell, chop and rain (`sickieCriteria.ts:81,83-85`). |
| 11 | Window is labelled from its first hour only | [M] new | `decisionBrief.ts:146`, `SickieView.tsx:77`. |
| 12 | Machine-readable default brief ignores swell and daylight | [M] new | `worker/reader.ts:48,131` use `mode=wind`. In that mode `eligible` returns before the swell, chop and rain checks (`server/briefing.ts:173`) and daylight is off by default (`:162`). |
| 13 | Fishing score issues | [M] for code, [R] for rules | See section 2. |

Also confirmed live on 14 Nov [M]: the whole of 14 Nov at Fremantle was "Avoid" because BOM's text said "the chance of a thunderstorm during this afternoon and early evening" (whole-day rule, `server/briefing.ts:290-294`). Model wind for midday was 6 to 9 kt while BOM's text said "Southeasterly 15 to 20 knots". The app showed the lower number with no range.

## 2. Fishing-score findings carried into this plan

| Finding | Verified | Evidence |
|---|---|---|
| Score uses moon, sun and model sea-level rate only | [M] | `shared/scoring.ts:157-199` |
| 4 stars turns a Marginal or no-marine hour into a "useful" hour, with no daylight test | [M] | `decisionBrief.ts:135` |
| "%" and "best fishing" remain in share sheet and brief | [M] | `BriefingSheet.tsx:25`, `server/briefing.ts:421,432` |
| Daily best fishing is the maximum over all 24 hours | [M] | `server/briefing.ts:339-340` |
| "Best upcoming" window is ranked by fishing score first | [M] new | `server/briefing.ts:346-348`, `decisionBrief.ts:195-196` |
| "Golden" on the live client path does not use the shared `isGolden` test | [M] new | `forecastApi.ts:124` (needs only Go or better, 4 stars, rain 0, daylight) against `shared/scoring.ts:64-82` (wind ≤10, gust ≤14, swell <1.0) |
| Calendar export is titled "Fishing window" | [M] | `client/src/lib/calendar.ts:23` |
| README says wind and rain are fishing inputs and calls the rating "safety" | [M] | `README.md:5,16` |
| README rating table does not match the code | [M] | `README.md:189-198` against `shared/scoring.ts:52-61` |
| No closed-season or species awareness | [M] no such code; [R] for the rules themselves | DPIRD rules were read on 12 Nov by the reviewer, not re-read today |

---

## 3. Phases

Effort: **S** up to half a day for a coding agent with review. **M** one to two days. **L** three days or more.

### Phase 1A. Safety-critical, small, no new data sources

Order matters. Cards 01 and 02 make the later cards one-place changes.

| Card | Change | Why | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| 01 | Remove the fishing score from every boating window and ranking | A boating call must depend on boating conditions only. Today the default window is decided by the moon [M, R]. | S | Low. More windows will appear, still bounded by the tight sl20 limits until card 07. | none |
| 02 | One rating entry point. No behaviour change | Eleven call sites and three window builders [M]. Without this, every later rule has to be added in up to eleven places and one will be missed. | M | Low to medium. Pure refactor. Parity tests guard it. | none |
| 03 | Daylight gate on every positive label | "Go" at midnight is live today [M]. | S | Low. | 02 |
| 04 | Swell height downgrades at any period | 4 m at 14 s rates "Go" [M]. | S | Low. Slightly more Marginal hours on big-swell days. | 02 |
| 05 | Fail closed on missing or stale data | Null wind is rated as calm [M]. | S | Low. | 02 |
| 06 | Read BOM wind warnings from the Local Waters page and, for spots offshore of Rottnest, the Perth Coast page. Widen the coverage box to Rottnest. Say so when warnings were not checked | A current Strong Wind Warning changes nothing today [M]. Rottnest gets no official cross-check [M]. | M | Medium. Warning markup verified on a real Perth Coast page (14 Nov 2026); a Local Waters warning page is still unseen. BOM scraping is outside BOM's default terms [R]; this card adds the Perth Coast page under that same gate. | 02 |
| 07 | One decision system: three states driven by the active vessel profile, one window builder | The label and the window disagree on the same screen [M]. | M to L | Medium to high. It changes every threshold the user sees. Numbers are [J] and need skipper sign-off before deploy. | 01 to 06 |
| 08 | Headline wording and one-hour look-ahead | "Good to go now" reads as a safety assurance and ignores the next hour [M]. | S | Low. | 07 |

### Phase 1B. Fishing-score honesty (small, not safety-critical, can run beside 1A after card 01)

| Card | Change | Why | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| 09 | Rename to "Bite-time guide", remove "%" and "best fishing", fix the golden mismatch, replace stars with three words (owner decision) | Stars and a number out of 100 read as a forecast [R]. Golden uses two different tests [M]. | S | Low. Visual change. | 01 |
| 10 | DPIRD rules line, calendar title, daily best over daylight in-limit hours, no fishing beyond the marine horizon, grey out on non-usable hours | The app is silent on current closures [R]. The 02:00 peak headlines the day [M]. | S | Low. The rules text goes stale; the card adds a "last checked" date and an expiry. | 03, 07 for the "in-limit" part |
| 11 | README, llms.txt, App Store draft, product contract, in-app explainer, MCP description | Public text is wrong today [M]. It must match whatever cards 01 to 10 ship. | S | Low. Docs only. | 07, 08, 09 |

### Phase 2. Wind direction, exposure per spot, lead time, model spread

| Card | Change | Why | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| 12 | Spot exposure table and effective wind (direction, weather shore, sea-breeze allowance, gust-ratio rule, swell exposure factor, reef flag) | A 14 kt easterly off the land and a 14 kt sea breeze get the same label [M]. Open-shelf swell is applied inside Cockburn Sound [R]. | M to L | High for the numbers, medium for the code. Every factor is [J]. A wrong shelter sector makes the app say "Inside" when it should not. Needs a skipper to mark up the table before deploy. | 07 |
| 13 | Lead-time caps: full call to 36 h, provisional to 72 h, outlook only beyond | Day 7 is shown with the same confidence as tomorrow [M]. | S | Low. | 07 |
| 14 | Fetch three wind models, show the range, cap the call when models disagree | One value hides a 3 to 12 kt spread [R]. Live today midday model wind was 6 to 9 kt against BOM text of 15 to 20 kt [M]. | M to L | Medium. Extra provider load and payload. Open-Meteo multi-model response shape not verified today. Free tier is non-commercial [R]. | 07, 12 preferred |

### Phase 3. Route and return-leg logic

| Card | Change | Why | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| 15 | Route table and leg scoring for Fremantle to Thomson Bay | The product's claimed edge does not exist [M]. | L | Medium. Two forecast points per brief. Leg geometry is simple; the numbers are [J]. | 07, 12 |
| 16 | Trip call: out leg, stay, return leg, "leave Thomson Bay by" time, sea-breeze-day flag, hysteresis, buffer, daylight fit | The classic Rottnest mistake is the afternoon return [R]. | L | High. This is the rule set a skipper will act on. It must pass the fixture table and a skipper walk-through before any tester sees it. | 15, 14 preferred |
| 17 | Trip view, `/brief` route output, wording, calendar and share text | The call has to be shown with its reason, confidence and age [R]. | M | Medium. | 16, 08 |

---

## 4. What is deliberately not in this brief

- **Thunderstorm whole-day rule.** Left as it is in Phase 1. Loosening a safety rule needs the skipper's decision first (question in SOURCES_AND_GAPS).
- **BOM licensing.** The app scrapes and republishes BOM text (`server/officialMarine.ts:3,38`, `server/briefing.ts:415`, `client/src/pages/Home.tsx:72`) [M]. The reviews flagged this as a gate [R]. Card 06 uses the same fetch and adds no republished text. A licensed feed or a link-only design is an owner decision, not a coding card.
- **Forecast and observation archive, back-test and the 10% gate.** The review asked for the archive to start at once [R]. It needs a schedule and storage, which are outside a read-only brief. Nothing in this plan measures accuracy. Passing every card does not make the tool validated.
- **Observations beside the forecast** (Rottnest, Swanbourne). New data source with BOM terms attached [R]. After Phase 3.
- **A real per-species "fishability" guide** (fishing review section 5.3). Product decision first.
- **Other routes** (Hillarys, Woodman Point, West End). Each needs its own exposure numbers and its own validation run [R].
- **`/health` reports `commit: null`** because `GIT_COMMIT_SHA` is not set at deploy (`worker/index.ts:125`) [M]. That is a deploy-script change. It should be fixed at the next approved deploy so that staging can be tied to a commit, but it is not a card here.

## 5. Working rules for the coding agent

1. Branch from `codex/cloudflare-worker`. One branch and one PR per card. Do not push to `main`. Do not merge without the owner.
2. Run `pnpm check` and `pnpm test` (`package.json` scripts) before opening the PR. No card is done with a red test.
3. Do not run `pnpm cf:deploy`, `scripts/cf-deploy.sh`, `scripts/cf-attach-domain.sh` or any `wrangler deploy`. **Deploy only with the owner's explicit approval.**
4. Tests must not call BOM or Open-Meteo. Use fixtures and mocked `fetch`, as `server/briefing.test.ts` already does.
5. Threshold numbers live in one constants block per card, each with a comment "proposal, pending skipper validation". Do not scatter literals.
6. Do not touch `ios/`, `wrangler*.jsonc`, `railway.json`, DNS, secrets or `.env*` in any card.
7. `TEST_FIXTURES.md` is the regression table. Each card names the fixture rows it must make pass.
