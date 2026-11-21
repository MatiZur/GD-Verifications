import test from 'node:test';
import assert from 'node:assert/strict';
import { canReviewVerification, validateBanDuration, validateVerificationSubmission } from '../src/services/verificationRules.js';

const accepted = [{ verifier_id: '12' }, { verifier_id: '13' }];
const submission = { verifierId: '12', publicLevelId: '123456', videoUrl: 'https://youtu.be/abcdefghijk', acceptedVerifiers: accepted };

test('verification submission requires an accepted verifier, public GD ID, and valid YouTube URL', () => {
  assert.equal(validateVerificationSubmission(submission), null);
  assert.match(validateVerificationSubmission({ ...submission, verifierId: '99' }), /verificador aceptado/);
  assert.match(validateVerificationSubmission({ ...submission, publicLevelId: '0' }), /ID pública/);
  assert.match(validateVerificationSubmission({ ...submission, videoUrl: 'https://example.com' }), /YouTube/);
});

test('only staff can resolve a pending verification with approve or reject', () => {
  assert.equal(canReviewVerification({ actorRole: 'ADMIN', status: 'PENDING', decision: 'APPROVE' }), true);
  assert.equal(canReviewVerification({ actorRole: 'OWNER', status: 'PENDING', decision: 'REJECT' }), true);
  assert.equal(canReviewVerification({ actorRole: 'USER', status: 'PENDING', decision: 'APPROVE' }), false);
  assert.equal(canReviewVerification({ actorRole: 'ADMIN', status: 'APPROVED', decision: 'REJECT' }), false);
});

test('temporary bans require a bounded positive day count; null means permanent', () => {
  assert.equal(validateBanDuration(null), true);
  assert.equal(validateBanDuration(7), true);
  assert.equal(validateBanDuration(0), false);
  assert.equal(validateBanDuration(3651), false);
  assert.equal(validateBanDuration('7'), false);
});
