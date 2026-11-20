export function validateChatMessage(value) {
  if (typeof value !== 'string') return 'El mensaje debe ser texto';
  const message = value.trim();
  if (!message) return 'El mensaje no puede estar vacío';
  if (message.length > 2000) return 'El mensaje no puede superar los 2000 caracteres';
  return null;
}

export function canAccessLevelChat({ creatorId, userId, hasAcceptedVerifiers, isAcceptedVerifier }) {
  if (String(creatorId) === String(userId)) return Boolean(hasAcceptedVerifiers);
  return Boolean(isAcceptedVerifier);
}
