import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreatorMarkLevelVerified, isLevelId, meetsHardestRequirement, validateLevelInput } from '../src/services/levelRules.js';

const body = {
  name: 'Example Demon',
  game_mode: 'CLASSIC',
  difficulty_estimate: 250,
  showcase_url: 'https://youtu.be/example',
  minimum_hardest_aredl_id: null
};

test('level publication accepts required fields and optional minimum hardest', () => {
  assert.equal(validateLevelInput(body), null);
  assert.equal(validateLevelInput({ ...body, minimum_hardest_aredl_id: 'classic-1' }, [{ id: 'classic-1' }]), null);
});

test('level publication rejects invalid names, YouTube URLs, modes, estimates, and unknown minimum hardests', () => {
  assert.match(validateLevelInput({ ...body, name: ' ' }), /nombre es obligatorio/);
  assert.match(validateLevelInput({ ...body, showcase_url: 'https://example.com/video' }), /YouTube/);
  assert.match(validateLevelInput({ ...body, game_mode: 'OTHER' }), /modalidad válida/);
  assert.match(validateLevelInput({ ...body, difficulty_estimate: 0 }), /Top entre 1 y 10000/);
  assert.match(validateLevelInput({ ...body, minimum_hardest_aredl_id: 'missing' }, []), /hardest mínimo/);
  assert.match(validateLevelInput({ ...body, minimum_hardest_aredl_id: 0 }, []), /hardest mínimo/);
});

test('level publication accepts optional optimized 16:9-compatible JPG or WebP payloads up to 4 MB', () => {
  const encodedImage = `data:image/webp;base64,${Buffer.from('image-bytes').toString('base64')}`;
  assert.equal(validateLevelInput({ ...body, image_data: encodedImage }), null);
  assert.match(validateLevelInput({ ...body, image_data: 'data:image/svg+xml;base64,PHN2Zz4=' }), /JPG o WebP/);
  const oversized = `data:image/jpeg;base64,${Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64')}`;
  assert.match(validateLevelInput({ ...body, image_data: oversized }), /no puede superar 4 MB/);
});

test('minimum hardest comparison treats a lower AREDL position as harder', () => {
  assert.equal(meetsHardestRequirement(20, 50), true);
  assert.equal(meetsHardestRequirement(50, 50), true);
  assert.equal(meetsHardestRequirement(80, 50), false);
  assert.equal(meetsHardestRequirement(null, 50), false);
  assert.equal(meetsHardestRequirement(null, null), true);
});

test('only the creator can verify an in-progress level with accepted verifiers', () => {
  const valid = { creatorId: '10', userId: 10, status: 'IN_PROGRESS', acceptedVerifierCount: 1 };
  assert.equal(canCreatorMarkLevelVerified(valid), true);
  assert.equal(canCreatorMarkLevelVerified({ ...valid, userId: 11 }), false);
  assert.equal(canCreatorMarkLevelVerified({ ...valid, status: 'AVAILABLE' }), false);
  assert.equal(canCreatorMarkLevelVerified({ ...valid, acceptedVerifierCount: 0 }), false);
});

test('level IDs must be valid positive PostgreSQL BIGINT values', () => {
  assert.equal(isLevelId('1'), true);
  assert.equal(isLevelId('9223372036854775807'), true);
  assert.equal(isLevelId('0'), false);
  assert.equal(isLevelId('-1'), false);
  assert.equal(isLevelId('9223372036854775808'), false);
  assert.equal(isLevelId('1 OR 1=1'), false);
});
