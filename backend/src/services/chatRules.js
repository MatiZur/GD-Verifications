export function validateChatMessage(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'El mensaje debe ser texto';
  const message = value.trim();
  if (!message) return 'El mensaje no puede estar vacío';
  if (message.length > 2000) return 'El mensaje no puede superar los 2000 caracteres';
  return null;
}

export function validateChatAttachment(file) {
  if (!file) return null;
  const bytes = file.buffer;
  const isImage = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp';
  const isVideo = file.mimetype === 'video/mp4' || file.mimetype === 'video/webm';
  if (!Buffer.isBuffer(bytes) || (!isImage && !isVideo)) return 'Adjuntá una imagen JPG, PNG o WebP, o un video MP4 o WebM';
  if (bytes.length > (isImage ? 8 : 25) * 1024 * 1024) return isImage ? 'La imagen adjunta supera 8 MB' : 'El video adjunto supera 25 MB';
  const signatureValid = file.mimetype === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8
    : file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.mimetype === 'image/webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
        : file.mimetype === 'video/mp4' ? bytes.toString('ascii', 4, 8) === 'ftyp'
          : bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return signatureValid ? null : 'El archivo adjunto no coincide con su formato';
}

export function canAccessLevelChat({ creatorId, userId, userRole, hasAcceptedVerifiers, isAcceptedVerifier, hasActiveReport = false }) {
  if (['ADMIN', 'OWNER'].includes(userRole)) return hasActiveReport === true;
  if (userRole !== 'USER') return false;
  if (String(creatorId) === String(userId)) return Boolean(hasAcceptedVerifiers);
  return Boolean(isAcceptedVerifier);
}
