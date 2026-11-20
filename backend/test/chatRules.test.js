import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessLevelChat, validateChatMessage } from '../src/services/chatRules.js';

test('chat messages accept non-empty text up to 2000 characters', () => {
  assert.equal(validateChatMessage('Hola'), null);
  assert.equal(validateChatMessage(` ${'x'.repeat(2000)} `), null);
});

test('chat messages reject empty, non-text, and oversized content', () => {
  assert.match(validateChatMessage('   '), /no puede estar vacío/);
  assert.match(validateChatMessage(12), /debe ser texto/);
  assert.match(validateChatMessage('x'.repeat(2001)), /2000 caracteres/);
});

test('only the creator and accepted verifiers can access a level group chat', () => {
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, hasAcceptedVerifiers: true, isAcceptedVerifier: false }), true);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, hasAcceptedVerifiers: false, isAcceptedVerifier: false }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 2, hasAcceptedVerifiers: true, isAcceptedVerifier: true }), true);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 2, hasAcceptedVerifiers: true, isAcceptedVerifier: false }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 3, hasAcceptedVerifiers: true, isAcceptedVerifier: false }), false);
});
