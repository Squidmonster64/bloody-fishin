# Sources and gaps: implementation fix brief

Prepared 14 November 2026 (AWST). Read-only. No code, branch, PR, issue, deployment, DNS, account or schedule was changed. No one was contacted. No secret was read or printed. Output was written only to this folder.

Labels: **[M]** verified by me in the code or on the live feed on 14 Nov 2026. **[R]** from the reviews of 12 Nov, not re-checked. **[J]** judgement.

---

## 1. Commits

| Item | Value | Label |
|---|---|---|
| Repository | `Squidmonster64/bloody-fishin` | [M] |
| Branch | `codex/cloudflare-worker` | [M] |
| Head | `93078fcd6baf24491a1ae512b87174d1148a6061`, committed 17 Oct 2026 22:32 UTC, "fix: scripts fall back to npx pnpm when pnpm is not installed" | [M] |
| Has the head moved since the reviews? | **No.** Same short SHA `93078fc` | [M] |
| Recent history on the branch | `93078fc`, `de2e92b`, `368b678`, `0195af3`, `96eb3a5` | [M] |
| Other branches (`main` `090eb78`, `codex/sprint3-ios-readiness` `0195af3`) | Not re-read. SHAs are from the review | [R] |
| Commit deployed on staging | **Unknown.** `/health` reports `commit: null` because `GIT_COMMIT_SHA` is not set (`worker/index.ts:125`) | [M] |

Access: `gh api` for the branch head, and a shallow read-only clone (`--depth 5`) into the session scratchpad. No install, build or test was run. Nothing was pushed.

## 2. Earlier reviews (read in full)

| File | Label |
|---|---|
| `../fable-boating/GO_WINDOW_REVIEW.md` (445 lines) | [R] |
| `../fable-boating/FISHING_SCORE_REVIEW.md` (245 lines) | [R] |
| `../fable-boating/SOURCES_AND_GAPS.md` (142 lines) | [R] |

The owner's decision brief (which recommended withdrawing the pilot) was not opened. I was told its conclusion and told not to re-argue it.

## 3. Code read at `93078fc`

| File | How fully |
|---|---|
| `shared/scoring.ts` | Full |
| `server/briefing.ts` | Full |
| `server/officialMarine.ts`, `shared/officialMarine.ts` | Full |
| `client/src/lib/decisionBrief.ts` | Full |
| `client/src/lib/sickieCriteria.ts`, `client/src/hooks/useVesselProfiles.ts` | Full |
| `client/src/lib/fishingEngine.ts` | Full (lines cut at 260 characters) |
| `client/src/lib/forecastApi.ts` | Full |
| `worker/index.ts` | Full |
| `client/src/lib/calendar.ts` | Full |
| `shared/scoring.test.ts`, `shared/forecastCorrections.test.ts`, `server/officialMarine.test.ts` | Full |
| `client/src/lib/decisionBrief.test.ts`, `decisionWindows.test.ts` | Most of each. Fixture helpers and the cases that pin calls |
| `client/src/components/SickieView.tsx` | Lines 25-135, 276-290, 433-437, plus keyword hits |
| `client/src/components/DecisionView.tsx` | Lines 20-62, 96-160, 184-290 |
| `worker/reader.ts` | Lines 40-52, 120-142 |
| `client/src/components/BriefingSheet.tsx` | Lines 1-30 |
| `client/src/pages/Home.tsx` | Lines 62-78 |
| `server/mcpServer.ts` | Lines 110-150 and a route search |
| `TableView.tsx`, `SummaryView.tsx`, `GraphView.tsx`, `PrintView.tsx`, `CompareSpotsSheet.tsx`, `standalonePrint.ts` | Keyword search only. Line numbers in the cards come from those hits |
| `README.md`, `client/public/llms.txt`, `docs/app-store/metadata-en-AU.md`, `PRODUCT_CONTRACT.md` | Keyword search only |
| Other test files, `server/index.ts` beyond the route list, `server/ops.ts`, `worker/mcp.ts`, `Controls.tsx`, `MySpotsManager.tsx`, `useFishingData.ts`, `forecastCache.ts`, `shared/forecastTime.ts`, `shared/http.ts`, `ios/`, deploy scripts, `wrangler*.jsonc` | **Not read** |

## 4. Live staging (GET only, two requests)

| Request | When (AWST) | Result | Label |
|---|---|---|---|
| `https://boating.bloodydaves.com/health` | 14 Nov, about 05:49 | 200. `stage: staging`, `runtime: cloudflare-workers`, `forecastVersion: 2026-09-26-marine-v2`, `commit: null` | [M] |
| `/brief.json?spot=freo&days=2&hours=all` | 14 Nov, 05:52 | 200. Default vessel `sl20`. Criteria `minStars 4, maxWind 10, maxGust 14, maxSwell 0.99, maxRain 0`. Zero windows. BOM status `available`, issued 01:01 WST 14 Nov. Every hour of 14 Nov "Avoid" (BOM thunderstorm text). 15 Nov 00:00 to 05:00 "Go" with `daylight: false`. 15 Nov 06:00 to 16:00 "Go" | [M] |

No load test. No other host was reached. One GET to `api.open-meteo.com` was tried to check the multi-model response shape and did not connect (no HTTP response).

## 5. What each headline claim rests on

All nine headline problems, and the extra findings numbered 3a, 10, 11 and 12 in `FIX_PLAN.md`, are **[M]**: I read the cited lines at `93078fc`. Two of them were also seen live on 14 Nov (night "Go"; zero windows beside "Go" hours).

Not re-measured, carried from the reviews as **[R]**:

- The year-long simulation showing the 4-star gate almost never opens.
- Model spread figures (3 to 8 kt, up to 12 kt) and the wave-model differences.
- The app's swell reading 0.28 to 0.52 m above WillyWeather.
- The owner's own 1.5 m swell ceiling.
- Route distances and headings (10 nm, 287°). Card 15 adds a test that recomputes them.
- All DPIRD rule statements.
- That BOM blocks automated readers from my side, and that scraping is outside BOM's default terms.

## 6. Unverified, and what depends on it

| # | Unverified item | Affects | What to do |
|---|---|---|---|
| 1 | **How a wind warning appears in the BOM Perth Local Waters page HTML.** The repo fixture has no warning. I did not fetch BOM. The phrase patterns in card 06 are from memory | Card 06 | Owner saves one copy of the page on a warning day. Until then the parser is untested against real markup |
| 2 | **Open-Meteo multi-model response field names** | Card 14 | Coding agent reads the provider docs first |
| 3 | Whether the Worker's BOM fetch keeps working. It returned `available` today, but BOM blocks scrapers elsewhere [R] | Cards 06, 07 | If it fails, every call caps at marginal by design. That will be visible |
| 4 | Whether the Open-Meteo plan in use covers a pilot. Free tier is non-commercial [R]. I did not look at any key or account | Card 14, and the product as a whole | Owner decision |
| 5 | The rendered app. I read source, not screens. Nothing was run in a browser or on a phone | All UI cards | Cards 08 and 17 ask for a 375 px screenshot |
| 6 | The test suite's current state. I did not install or run it. I do not know that it is green at `93078fc` | All cards | First step for the coding agent: run `pnpm check` and `pnpm test` on a clean checkout and report |
| 7 | Line numbers inside files I only keyword-searched (section 3) | Cards 08, 09, 10, 11 | They are grep hits at `93078fc` and should be right, but the surrounding code was not read |
| 8 | DPIRD rules since 12 Nov 2026, the closure start date, the bioregion boundary, and the right DPIRD URL | Card 10 | Owner confirms before deploy |
| 9 | ~~What an "SL20" is~~ **Answered by the owner 14 Nov: Whittley SL20 (Sea Legend 20), 2019, outboard version.** Maker spec sheet: hull 6.37 m, beam 2.40 m, standard engine Mercury 150, 210 L fuel, max 6 people [P]. A trailerable half-cabin power boat, inside the 5 to 6.5 m assumption, so the proposed limits stand as proposals | Cards 07, 15, 16 | Cruising speeds still unknown: see skipper question 1 |
| 10 | Any observation-based accuracy. None exists [R] | Everything | No card measures accuracy. The archive and back-test are outside this brief |
| 11 | Every limit, factor, sector and timing constant in cards 04, 06, 07, 12, 13, 14, 15, 16 | The calls themselves | All [J] except the 1.5 m swell figure. Skipper validation before deploy |
| 12 | Whether `main` or the Sprint 3 branch has diverged in the files these cards touch | Merge effort | Not checked |
| 13 | Saved-profile data in real users' browsers | Card 07 migration | Shape taken from `useVesselProfiles.ts:9-16` only |
| 14 | Legal position on wording and on BOM text | Cards 06, 08, 17 | Drafting help only. Not legal advice [R] |

## 7. Decisions I made that the owner may want to reverse

| Decision | Where | Alternative |
|---|---|---|
| Unchecked warnings cap the call at marginal everywhere, including Shark Bay and overseas spots | Card 06 | Banner only, no cap. One constant |
| Strong Wind Warning is outside limits for tinnie, sl20 and kayak; marginal cap for offshore | Cards 06, 07 | Outside for all |
| Rain chance is no longer a boating limit. It becomes an opt-in Sickie filter | Card 07 | Keep a rain limit per preset |
| The whole-day thunderstorm rule is left alone | Cards 06, 07 | Cap at marginal, outside only near model storm hours [R section 4.7] |
| Stars and NN/100 replaced by Quiet / Fair / Prime time | Card 09 | Keep stars, relabel only |
| All named presets become daylight-only, including offshore | Card 07 | Leave offshore able to run at night |
| "Excellent" is retired. Three states plus "No call" | Cards 07, 08 | Keep a fourth, better-than-inside state |
| sl20 limits tighten the label (15 kt to 12 kt inside) and loosen the window (10 kt, 0.99 m to 12 kt, 1.5 m) | Card 07 | Any other pair the skipper sets |
| Coverage box west edge 115.49, with a "near" strip to 115.40 | Card 06 | Different edge, or treat all of Rottnest as Perth Coast |
| Sea-breeze allowance 1.20 applied to every Perth-region spot from 10:00 to 18:59 | Card 12 | Summer months only, or drop until measured |
| Pilot route is Fremantle to Thomson Bay only | Card 15 | Add Hillarys or Woodman Point later |

## 8. Questions only the skipper can answer

**The boat**

1. ~~What is the SL20~~ Whittley SL20 2019 outboard, Yamaha 150 four-stroke, 6.37 m half-cabin power boat (owner, 14 Nov). Planning speeds now 22 kt cruise and 15 kt marginal, from a published SL20 OB test (card 15). Still wanted: the owner's own GPS speeds at 4,000 and 4,500 rpm, flat and in a chop.
2. With family aboard, what mean wind and what gust would make you not leave Thomson Bay? Are 12 kt mean and 16 kt gust the right "comfortable" line, and 16 and 21 the right "no" line?
3. Is 1.5 m still your swell ceiling? Is that the offshore forecast number, or what you feel in Gage Roads?
4. What wind chop height turns the trip from fine to unpleasant: is 0.4 m and 0.7 m about right?

**The water**

5. For each spot in card 12's table: from which wind directions is it properly sheltered? Mark the sectors up or down.
6. How much of the offshore swell reaches Gage Roads, Thomson Bay, Cockburn Sound and Hillarys? Are 0.5, 0.3, 0.2 and 0.5 fair?
7. Where does reef or a bank make long-period swell the hazard, not the wind? Is the reef flag on the right spots?
8. Do Parker Point and Salmon Bay belong under Perth Local Waters, or under the Perth Coast forecast?
9. Is "Fremantle Offshore" at 115.65 a place you actually go, and is it in or out of the shelter of Rottnest for a south-west swell?

**Timing**

10. On a sea-breeze day, how long before the breeze fills in do you want to be leaving the island: is one hour right?
11. Is two hours the shortest stay that makes a Rottnest trip worth doing?
12. How close to sunset are you willing to be tied up: one hour before, or less?
13. Would you ever use a late-afternoon return after the breeze eases, with family aboard?
14. Does the app's forecast sea breeze usually arrive later or lighter than the real one? By how much? (This sets the 1.20 allowance.)

**Rules of the tool**

15. A Strong Wind Warning is current for Perth Local Waters and the model shows 9 kt. Should the app say "outside your limits" for your boat, always?
16. BOM says "chance of a thunderstorm in the afternoon". Should the whole day be outside limits, or only the afternoon?
17. If the app cannot read BOM warnings, should it refuse to say "inside your limits", or say it with a notice?
18. Should any vessel get a positive call at night?
19. Forecasts past three days: outlook only, or do you want a provisional call out to day five?
20. Should rain chance ever stop a boating window, or is it only a comfort note?

**Fishing**

21. Do you want fishing in the pilot at all?
22. Stars, or the three words Quiet / Fair / Prime time?
23. Who checks the DPIRD rules note, and how often?

**Process**

24. Who are the two or three experienced local skippers who will mark up the limits and the spot table, and will their names and the date be recorded?
25. Can someone save a copy of the BOM Perth Local Waters page on the next Strong Wind Warning day, for card 06's test?
26. Can the forecast and observation archive start now, as the review asked? It is outside this brief, and every day not archived is lost [R].

## 9. Files in this folder

| File | Content |
|---|---|
| `FIX_PLAN.md` | Verified problems with file:line, three phases, why, effort, risk, dependency |
| `cards/01` to `cards/17` | One task card per change |
| `TEST_FIXTURES.md` | Scenario table with expected labels now, after Phase 1 and after Phase 2, plus route and fishing scenarios |
| `SOURCES_AND_GAPS.md` | This file |
| `PROGRESS.md` | Working log |


## Update 14 Nov 2026

The owner confirmed the vessel: Whittley SL20, 2019, outboard (OB) version. Source for dimensions: Whittley "SL 20 OB SPECS & STANDARDS" sheet, https://whittleyboats.treepl.co/SL%2020%20OB%20SPECS%20%20STANDARDS.pdf (hull 6.37 m, beam 2.40 m, 7.50 m on trailer). Dry weight for the OB version was not found.

Engine confirmed by the owner: Yamaha 150 four-stroke. Speed source: boatsales.com.au review of the SL 20 OB with a Yamaha F130A, as republished by Whittley, https://whittleyboats.treepl.co/reviews/sl-20-ob-boatsales-com-au (rpm, speed and fuel table; test in a gusty 15 kt south-westerly chop on Port Phillip Bay). No published test with the F150 was found. Card 15 speeds and the dependent times in cards 16 and 17 and TEST_FIXTURES section 5 were updated.
