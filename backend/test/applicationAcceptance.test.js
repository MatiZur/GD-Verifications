import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/routes/levels.js', import.meta.url), 'utf8');
const start = source.indexOf("router.patch('/:id/applications'");
const end = source.indexOf("router.patch('/:id/verify'", start);
const acceptanceRoute = source.slice(start, end);
const rejectionStart = source.indexOf("router.patch('/:id/applications/:applicationId/reject'");
const rejectionEnd = source.indexOf("router.patch('/:id/verify'", rejectionStart);
const rejectionRoute = source.slice(rejectionStart, rejectionEnd);

test('accepting applications explicitly preserves applications_open instead of closing the level', () => {
  assert.match(acceptanceRoute, /SELECT creator_id, name, status, applications_open FROM levels/);
  assert.match(acceptanceRoute, /applications_open = \$2/);
  assert.match(acceptanceRoute, /applicationsOpenAfterVerifierAcceptance\(level\.applications_open\)/);
  assert.doesNotMatch(acceptanceRoute, /applications_open\s*=\s*FALSE/);
});

test('application rejection is creator-only, pending-only, and retains the application row', () => {
  assert.match(rejectionRoute, /authenticateToken, requireActiveUser/);
  assert.match(rejectionRoute, /FOR UPDATE/);
  assert.match(rejectionRoute, /canCreatorRejectApplication\(/);
  assert.match(rejectionRoute, /UPDATE applications SET status = 'REJECTED'/);
  assert.doesNotMatch(rejectionRoute, /DELETE FROM applications/);
});

test('a duplicate application remains a conflict after a player was rejected', () => {
  assert.match(source, /UNIQUE.*23505|error\.code === '23505'[\s\S]*Ya te postulaste para este nivel/);
});
