import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');

test('the initial schema defines every table used by the application', () => {
  for (const table of [
    'users', 'levels', 'applications', 'notifications',
    'verification_submissions', 'admin_logs', 'level_messages', 'chat_reports', 'temporary_level_ban_snapshots',
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`));
  }
});

test('the initial schema includes profile, level, attachment, and moderation fields', () => {
  for (const field of [
    'hardest_classic_aredl_id', 'hardest_platformer_aredl_id', 'pronouns', 'country',
    'minimum_hardest_aredl_id', 'difficulty_estimate', 'image_data', 'applications_open', 'open_verification',
    'attachment_data', 'attachment_mime_type', 'admin_logs',
  ]) {
    assert.match(schema, new RegExp(`\\b${field}\\b`));
  }
});

test('the schema seeds the initial owner without resetting an existing owner account', () => {
  assert.match(schema, /'owner'\s*,\s*'owner@gd-verifications\.local'/);
  assert.match(schema, /'OWNER'\s*\)\s*ON CONFLICT \(username\) DO NOTHING/s);
});

test('the schema is wrapped in a transaction and creates indexes idempotently', () => {
  assert.match(schema, /\bBEGIN;/);
  assert.match(schema, /COMMIT;\s*$/);
  assert.match(schema, /CREATE INDEX IF NOT EXISTS idx_level_messages_level_created/);
  assert.match(schema, /public_level_id VARCHAR\(30\)/);
  assert.match(schema, /banned_at TIMESTAMPTZ/);
});

test('an application is unique per player and level, including after rejection', () => {
  assert.match(schema, /UNIQUE \(level_id, verifier_id\)/);
});
