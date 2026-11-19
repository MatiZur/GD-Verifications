import test from 'node:test';
import assert from 'node:assert/strict';
import { isAvatarValue, isHttpUrl, isYouTubeUrl } from '../src/validators/profile.js';

test('profile URL validation only accepts HTTP and HTTPS', () => {
  assert.equal(isHttpUrl('https://example.com/path'), true);
  assert.equal(isHttpUrl('http://example.com'), true);
  assert.equal(isHttpUrl('javascript:alert(1)'), false);
  assert.equal(isHttpUrl('not a URL'), false);
  assert.equal(isHttpUrl(''), true);
});

test('YouTube validation accepts supported hosts and rejects lookalikes and insecure URLs', () => {
  assert.equal(isYouTubeUrl('https://youtu.be/abc123'), true);
  assert.equal(isYouTubeUrl('https://www.youtube.com/watch?v=abc123'), true);
  assert.equal(isYouTubeUrl('https://youtube.com/@creator'), true);
  assert.equal(isYouTubeUrl('http://youtube.com/watch?v=abc123'), false);
  assert.equal(isYouTubeUrl('https://youtube.com.evil.example/video'), false);
  assert.equal(isYouTubeUrl('https://notyoutube.com/video'), false);
});

test('avatar data URLs are limited to supported image signatures and size', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64');
  const jpeg = Buffer.from([255, 216, 255, 0]).toString('base64');
  const webp = Buffer.from('RIFFxxxxWEBP').toString('base64');
  assert.equal(isAvatarValue(`data:image/png;base64,${png}`), true);
  assert.equal(isAvatarValue(`data:image/jpeg;base64,${jpeg}`), true);
  assert.equal(isAvatarValue(`data:image/webp;base64,${webp}`), true);
  assert.equal(isAvatarValue('data:image/png;base64,Zm9v'), false);
  assert.equal(isAvatarValue('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isAvatarValue(`data:image/png;base64,${Buffer.alloc(1_000_001).toString('base64')}`), false);
});
