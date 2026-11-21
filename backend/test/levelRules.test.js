import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreatorCloseApplications, canCreatorDeleteCancelledLevel, canCreatorMarkLevelVerified, canCreatorRemoveAcceptedVerifier, canCreatorRestoreLevel, canCreatorWithdrawLevel, isLevelId, meetsHardestRequirement, validateLevelInput } from '../src/services/levelRules.js';

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

test('only the creator can withdraw an available level without accepted verifiers', () => {
  const valid = { creatorId: '10', userId: 10, status: 'AVAILABLE', acceptedVerifierCount: 0 };
  assert.equal(canCreatorWithdrawLevel(valid), true);
  assert.equal(canCreatorWithdrawLevel({ ...valid, userId: 11 }), false);
  assert.equal(canCreatorWithdrawLevel({ ...valid, status: 'IN_PROGRESS' }), false);
  assert.equal(canCreatorWithdrawLevel({ ...valid, acceptedVerifierCount: 1 }), false);
});

test('only the creator can explicitly close applications on an available or in-progress level', () => {
  const valid = { creatorId: '10', userId: 10, status: 'AVAILABLE', applicationsOpen: true, acceptedVerifierCount: 0 };
  assert.equal(canCreatorCloseApplications(valid), true);
  assert.equal(canCreatorCloseApplications({ ...valid, userId: 11 }), false);
  assert.equal(canCreatorCloseApplications({ ...valid, applicationsOpen: false }), false);
  assert.equal(canCreatorCloseApplications({ ...valid, status: 'IN_PROGRESS', acceptedVerifierCount: 1 }), true);
  assert.equal(canCreatorCloseApplications({ ...valid, status: 'VERIFIED' }), false);
});

test('only the creator can restore a cancelled level without accepted verifiers', () => {
  const valid = { creatorId: '10', userId: 10, status: 'CANCELLED', acceptedVerifierCount: 0 };
  assert.equal(canCreatorRestoreLevel(valid), true);
  assert.equal(canCreatorRestoreLevel({ ...valid, userId: 11 }), false);
  assert.equal(canCreatorRestoreLevel({ ...valid, status: 'AVAILABLE' }), false);
  assert.equal(canCreatorRestoreLevel({ ...valid, acceptedVerifierCount: 1 }), false);
});

test('only the creator can remove an accepted verifier from an in-progress level', () => {
  const valid = { creatorId: 10, userId: '10', status: 'IN_PROGRESS', applicationStatus: 'ACCEPTED' };
  assert.equal(canCreatorRemoveAcceptedVerifier(valid), true);
  assert.equal(canCreatorRemoveAcceptedVerifier({ ...valid, userId: 11 }), false);
  assert.equal(canCreatorRemoveAcceptedVerifier({ ...valid, status: 'VERIFIED' }), false);
  assert.equal(canCreatorRemoveAcceptedVerifier({ ...valid, applicationStatus: 'PENDING' }), false);
});

test('only the creator can delete a cancelled level', () => {
  const valid = { creatorId: '10', userId: 10, status: 'CANCELLED' };
  assert.equal(canCreatorDeleteCancelledLevel(valid), true);
  assert.equal(canCreatorDeleteCancelledLevel({ ...valid, userId: 11 }), false);
  assert.equal(canCreatorDeleteCancelledLevel({ ...valid, status: 'AVAILABLE' }), false);
});

test('level IDs must be valid positive PostgreSQL BIGINT values', () => {
  assert.equal(isLevelId('1'), true);
  assert.equal(isLevelId('9223372036854775807'), true);
  assert.equal(isLevelId('0'), false);
  assert.equal(isLevelId('-1'), false);
  assert.equal(isLevelId('9223372036854775808'), false);
  assert.equal(isLevelId('1 OR 1=1'), false);
});
