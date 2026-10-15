import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync(new URL('./client/src/components/Header.tsx', import.meta.url), 'utf8');
const table = readFileSync(new URL('./client/src/components/TableView.tsx', import.meta.url), 'utf8');
const decision = readFileSync(new URL('./client/src/components/DecisionView.tsx', import.meta.url), 'utf8');
const sickie = readFileSync(new URL('./client/src/components/SickieView.tsx', import.meta.url), 'utf8');
const scoring = readFileSync(new URL('./shared/scoring.ts', import.meta.url), 'utf8');
const criteria = readFileSync(new URL('./client/src/lib/sickieCriteria.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('./client/src/index.css', import.meta.url), 'utf8');
const home = readFileSync(new URL('./client/src/pages/Home.tsx', import.meta.url), 'utf8');

test('Fishing Planner header is focused, non-linked product branding', () => {
  assert.match(header, /aria-label="Bloody Dave's Fishing Planner"/);
  assert.match(header, /Fishing Planner/);
  assert.doesNotMatch(header, /CONTROL_URL|SuiteNav|<a\b|control\.bloodydaves\.com/);
});

test('public titles and headings say Boating, not SL20', () => {
  assert.doesNotMatch(header, /SL20/);
  assert.match(table, />Boating</);
  assert.doesNotMatch(table, />SL20</);
  assert.match(decision, /Boating n\/a/);
  assert.match(decision, /Boating \$\{brief\.currentSl\.label\}/);
  assert.doesNotMatch(decision, /SL20 /);
  assert.match(sickie, /Min Boating Rating/);
  assert.match(sickie, />Boating Rank</);
  assert.doesNotMatch(sickie, /Min SL20 Rating/);
});

test('SL20 vessel scoring and profile configuration stay in place', () => {
  assert.match(scoring, /export function rateSL20/);
  assert.match(criteria, /minSL20Rank/);
  assert.match(criteria, /label: "SL20 \/ Half-cabin"/);
});

test('large desktop layout is centred, readable and internally grouped', () => {
  assert.match(css, /@media \(min-width: 1200px\)/);
  assert.match(css, /\.app-shell/);
  assert.match(css, /92rem/);
  assert.match(css, /\.decision-timeline-grid/);
  assert.match(css, /repeat\(8, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.daily-hours-grid/);
  assert.match(css, /repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(home, /app-shell app-main/);
});

test('theme uses Bloody Dave marine tokens, not 5M paper/red', () => {
  assert.match(css, /--app-bg:\s*#152018/);
  assert.match(css, /--action:\s*#ef7c35/);
  assert.match(css, /--sand:\s*#d7bd7c/);
  assert.match(css, /--text:\s*#f2efe7/);
  assert.doesNotMatch(css, /--app-bg:\s*#f5f1e7/);
  assert.doesNotMatch(css, /--app-bg:\s*#0b0f19/);
  assert.doesNotMatch(css, /--action:\s*#c3261c/);
  assert.doesNotMatch(css, /--action:\s*#3b82f6/);
});

test('decision view is GOOD/POOR-first with truthful forecast-source labels and compact GO', () => {
  assert.match(decision, /windowKind/);
  assert.match(decision, /"GOOD"/);
  assert.match(decision, /"POOR"/);
  assert.match(decision, /label: "GO"/);
  assert.match(decision, /label="Wind"/);
  assert.match(decision, /label="Swell"/);
  assert.match(decision, /label="Model sea level"/);
  assert.match(decision, /label="Water"/);
  assert.match(decision, /label="Coastal air forecast"/);
  assert.match(decision, /label="Coastal rain chance"/);
  assert.match(decision, /aria-label="Next hours"/);
  assert.doesNotMatch(decision, /text-4xl|text-5xl|text-6xl/);
  assert.doesNotMatch(home, /sidebar/i);
});

test('forecast provider attribution is visible in the product footer', () => {
  assert.match(home, /Weather and marine model data by/);
  assert.match(home, /https:\/\/open-meteo\.com\//);
});
