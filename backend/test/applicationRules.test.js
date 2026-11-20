import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplicationSelection } from '../src/services/applicationRules.js';

test('bulk application selection accepts one or multiple unique PostgreSQL IDs', () => {
  assert.equal(validateApplicationSelection(['1']), null);
  assert.equal(validateApplicationSelection(['1', '20']), null);
});

test('bulk application selection rejects empty, oversized, invalid, and duplicate selections', () => {
  assert.match(validateApplicationSelection([]), /entre 1 y 100/);
  assert.match(validateApplicationSelection(Array.from({ length: 101 }, (_, index) => String(index + 1))), /entre 1 y 100/);
  assert.match(validateApplicationSelection(['1 OR 1=1']), /no es válida/);
  assert.match(validateApplicationSelection(['1', '1']), /No repitas/);
  assert.match(validateApplicationSelection('1'), /entre 1 y 100/);
});
