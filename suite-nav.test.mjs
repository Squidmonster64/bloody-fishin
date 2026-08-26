import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync(new URL('./client/src/components/Header.tsx', import.meta.url), 'utf8');

test('Fishing Planner header mark links to Bloody Dave’s Control', () => {
  assert.match(header, /href="https:\/\/control\.bloodydaves\.com"/);
  assert.match(header, /aria-label="Bloody Dave's Control"/);
});
