import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync(new URL('./client/src/components/Header.tsx', import.meta.url), 'utf8');
const table = readFileSync(new URL('./client/src/components/TableView.tsx', import.meta.url), 'utf8');
const decision = readFileSync(new URL('./client/src/components/DecisionView.tsx', import.meta.url), 'utf8');
const sickie = readFileSync(new URL('./client/src/components/SickieView.tsx', import.meta.url), 'utf8');
const scoring = readFileSync(new URL('./shared/scoring.ts', import.meta.url), 'utf8');
const criteria = readFileSync(new URL('./client/src/lib/sickieCriteria.ts', import.meta.url), 'utf8');

test('Fishing Planner header mark links to Bloody Dave’s Control', () => {
  assert.match(header, /href="https:\/\/control\.bloodydaves\.com"/);
  assert.match(header, /aria-label="Bloody Dave's Control"/);
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
