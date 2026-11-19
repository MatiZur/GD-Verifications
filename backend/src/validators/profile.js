export function isHttpUrl(value) {
  if (value === null || value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isYouTubeUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtube.com') || url.hostname === 'youtube.com');
  } catch {
    return false;
  }
}

export function isAvatarValue(value) {
  if (!value || isHttpUrl(value)) return true;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || value.length > 1_500_000) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 1_000_000) return false;
  if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (match[1] === 'jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}
