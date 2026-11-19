import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration } from '../src/validators/auth.js';

test('registration requires username, email, and password', () => {
  assert.match(validateRegistration({}), /obligatorios/);
});

test('registration accepts a valid account and enforces username format', () => {
  assert.equal(validateRegistration({ username: 'Player_01', email: 'player@example.com', password: 'password123' }), null);
  assert.match(validateRegistration({ username: 'ab', email: 'player@example.com', password: 'password123' }), /usuario debe tener/);
  assert.match(validateRegistration({ username: 'player-name', email: 'player@example.com', password: 'password123' }), /usuario debe tener/);
  assert.match(validateRegistration({ username: 123, email: 'player@example.com', password: 'password123' }), /usuario debe tener/);
});

test('registration validates email and bcrypt-compatible password length', () => {
  assert.match(validateRegistration({ username: 'player', email: 'not-an-email', password: 'password123' }), /email no es válido/);
  assert.match(validateRegistration({ username: 'player', email: 'player@example.com', password: 'short' }), /contraseña debe tener/);
  assert.match(validateRegistration({ username: 'player', email: 'player@example.com', password: 'p'.repeat(73) }), /contraseña debe tener/);
  assert.equal(validateRegistration({ username: 'player', email: 'player@example.com', password: 'p'.repeat(72) }), null);
});
