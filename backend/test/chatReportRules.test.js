import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChatReport } from '../src/services/chatReportRules.js';

const valid = { reporterId: '1', reportedUserId: '2', reason: 'Mensajes ofensivos', reporterIsParticipant: true, targetIsParticipant: true };

test('chat reports require distinct participants and a bounded reason', () => {
  assert.equal(validateChatReport(valid), null);
  assert.match(validateChatReport({ ...valid, reportedUserId: '1' }), /No podés reportarte/);
  assert.match(validateChatReport({ ...valid, reason: 'no' }), /entre 5 y 1000/);
  assert.match(validateChatReport({ ...valid, targetIsParticipant: false }), /participantes del chat/);
  assert.match(validateChatReport({ ...valid, reporterIsParticipant: false }), /participantes del chat/);
});
