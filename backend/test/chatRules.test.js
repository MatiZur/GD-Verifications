import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessLevelChat, validateChatAttachment, validateChatMessage } from '../src/services/chatRules.js';

test('chat messages accept non-empty text up to 2000 characters', () => {
  assert.equal(validateChatMessage('Hola'), null);
  assert.equal(validateChatMessage(` ${'x'.repeat(2000)} `), null);
});

test('chat messages reject empty, non-text, and oversized content', () => {
  assert.match(validateChatMessage('   '), /no puede estar vacío/);
  assert.match(validateChatMessage(12), /debe ser texto/);
  assert.match(validateChatMessage('x'.repeat(2001)), /2000 caracteres/);
});

test('chat accepts an empty text field only when a supported attachment is present', () => {
  assert.equal(validateChatMessage(''), null);
  assert.equal(validateChatAttachment({ mimetype: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }), null);
  assert.equal(validateChatAttachment({ mimetype: 'video/mp4', buffer: Buffer.from('0000ftyp') }), null);
  assert.match(validateChatAttachment({ mimetype: 'image/png', buffer: Buffer.from('not png') }), /no coincide/);
  assert.match(validateChatAttachment({ mimetype: 'application/pdf', buffer: Buffer.from('%PDF') }), /Adjuntá una imagen/);
  assert.match(validateChatAttachment({ mimetype: 'video/mp4', buffer: Buffer.alloc(25 * 1024 * 1024 + 1) }), /25 MB/);
});

test('only the creator and accepted verifiers can access a level group chat', () => {
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, userRole: 'USER', hasAcceptedVerifiers: true, isAcceptedVerifier: false }), true);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, userRole: 'USER', hasAcceptedVerifiers: false, isAcceptedVerifier: false }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 2, userRole: 'USER', hasAcceptedVerifiers: true, isAcceptedVerifier: true }), true);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 2, userRole: 'USER', hasAcceptedVerifiers: true, isAcceptedVerifier: false }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 3, userRole: 'USER', hasAcceptedVerifiers: true, isAcceptedVerifier: false }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, userRole: 'ADMIN', hasAcceptedVerifiers: true, isAcceptedVerifier: false }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 2, userRole: 'OWNER', hasAcceptedVerifiers: true, isAcceptedVerifier: true }), false);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, userRole: 'ADMIN', hasAcceptedVerifiers: true, isAcceptedVerifier: false, hasActiveReport: true }), true);
  assert.equal(canAccessLevelChat({ creatorId: '1', userId: 1, userRole: 'OWNER', hasAcceptedVerifiers: true, isAcceptedVerifier: false, hasActiveReport: false }), false);
});
