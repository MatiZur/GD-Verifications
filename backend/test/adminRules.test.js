import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessAdministration, canPromoteToAdmin, canReviewLevel } from '../src/services/adminRules.js';

test('only admins and owner can access administration', () => {
  assert.equal(canAccessAdministration('ADMIN'), true);
  assert.equal(canAccessAdministration('OWNER'), true);
  assert.equal(canAccessAdministration('USER'), false);
});

test('only owner can promote a regular user to admin', () => {
  assert.equal(canPromoteToAdmin({ actorRole: 'OWNER', targetRole: 'USER' }), true);
  assert.equal(canPromoteToAdmin({ actorRole: 'ADMIN', targetRole: 'USER' }), false);
  assert.equal(canPromoteToAdmin({ actorRole: 'OWNER', targetRole: 'ADMIN' }), false);
  assert.equal(canPromoteToAdmin({ actorRole: 'OWNER', targetRole: 'OWNER' }), false);
});

test('admins and owner can only review levels awaiting review with a supported decision', () => {
  assert.equal(canReviewLevel({ actorRole: 'ADMIN', levelStatus: 'PENDING_REVIEW', decision: 'APPROVE' }), true);
  assert.equal(canReviewLevel({ actorRole: 'OWNER', levelStatus: 'PENDING_REVIEW', decision: 'REJECT' }), true);
  assert.equal(canReviewLevel({ actorRole: 'USER', levelStatus: 'PENDING_REVIEW', decision: 'APPROVE' }), false);
  assert.equal(canReviewLevel({ actorRole: 'ADMIN', levelStatus: 'AVAILABLE', decision: 'REJECT' }), false);
  assert.equal(canReviewLevel({ actorRole: 'ADMIN', levelStatus: 'PENDING_REVIEW', decision: 'DELETE' }), false);
});
