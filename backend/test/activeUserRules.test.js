import test from 'node:test';
import assert from 'node:assert/strict';
import { requireActiveUser } from '../src/middleware/auth.js';

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('suspensions block protected activities but do not turn authentication itself into a lockout', () => {
  const bannedResponse = response();
  let bannedNext = false;
  requireActiveUser({ user: { isBanned: true } }, bannedResponse, () => { bannedNext = true; });
  assert.equal(bannedResponse.statusCode, 403);
  assert.equal(bannedNext, false);

  const activeResponse = response();
  let activeNext = false;
  requireActiveUser({ user: { isBanned: false } }, activeResponse, () => { activeNext = true; });
  assert.equal(activeResponse.statusCode, 200);
  assert.equal(activeNext, true);
});
