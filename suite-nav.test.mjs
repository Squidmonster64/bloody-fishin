import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync(new URL('./client/src/components/Header.tsx', import.meta.url), 'utf8');
const suiteNav = readFileSync(new URL('./client/src/components/SuiteNav.tsx', import.meta.url), 'utf8');
const suiteLib = readFileSync(new URL('./client/src/lib/suiteNav.ts', import.meta.url), 'utf8');
const table = readFileSync(new URL('./client/src/components/TableView.tsx', import.meta.url), 'utf8');
const decision = readFileSync(new URL('./client/src/components/DecisionView.tsx', import.meta.url), 'utf8');
const sickie = readFileSync(new URL('./client/src/components/SickieView.tsx', import.meta.url), 'utf8');
const scoring = readFileSync(new URL('./shared/scoring.ts', import.meta.url), 'utf8');
const criteria = readFileSync(new URL('./client/src/lib/sickieCriteria.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('./client/src/index.css', import.meta.url), 'utf8');
const home = readFileSync(new URL('./client/src/pages/Home.tsx', import.meta.url), 'utf8');

test('Fishing Planner header mark links to Bloody Dave’s Control', () => {
  assert.match(header, /CONTROL_URL/);
  assert.match(header, /aria-label="Bloody Dave's Control"/);
  assert.match(suiteLib, /https:\/\/control\.bloodydaves\.com/);
});

test('public titles and headings say Boating, not SL20', () => {
  assert.match(header, /Boating \+ fishing/);
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

test('compact horizontal suite nav lists Control and family products', () => {
  assert.match(suiteNav, /aria-label="Bloody Dave's Suite"/);
  assert.match(suiteNav, /hidden min-\[700px\]:flex/);
  for (const name of ['Control', 'Fishin', 'Recipes', 'Pantry', 'Get List', 'Lift Log']) {
    assert.match(suiteLib, new RegExp(name));
  }
  assert.match(suiteLib, /https:\/\/weather\.bloodydaves\.com/);
  assert.match(suiteLib, /https:\/\/recipes\.bloodydaves\.com/);
  assert.match(suiteLib, /https:\/\/pantry\.bloodydaves\.com/);
  assert.match(suiteLib, /https:\/\/list\.bloodydaves\.com/);
  assert.match(suiteLib, /https:\/\/lift\.bloodydaves\.com/);
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

test('decision view is GOOD/POOR-first with Wind/Swell/Tide/Water and compact GO', () => {
  assert.match(decision, /windowKind/);
  assert.match(decision, /"GOOD"/);
  assert.match(decision, /"POOR"/);
  assert.match(decision, /label: "GO"/);
  assert.match(decision, /label="Wind"/);
  assert.match(decision, /label="Swell"/);
  assert.match(decision, /label="Tide"/);
  assert.match(decision, /label="Water"/);
  assert.match(decision, /aria-label="Next hours"/);
  assert.doesNotMatch(decision, /text-4xl|text-5xl|text-6xl/);
  assert.doesNotMatch(home, /sidebar/i);
});
