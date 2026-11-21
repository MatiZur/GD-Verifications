import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/routes/levels.js', import.meta.url), 'utf8');
const start = source.indexOf("router.patch('/:id/applications'");
const end = source.indexOf("router.patch('/:id/verify'", start);
const acceptanceRoute = source.slice(start, end);

test('accepting applications explicitly preserves applications_open instead of closing the level', () => {
  assert.match(acceptanceRoute, /SELECT creator_id, name, status, applications_open FROM levels/);
  assert.match(acceptanceRoute, /applications_open = \$2/);
  assert.match(acceptanceRoute, /applicationsOpenAfterVerifierAcceptance\(level\.applications_open\)/);
  assert.doesNotMatch(acceptanceRoute, /applications_open\s*=\s*FALSE/);
});
