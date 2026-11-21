export function validateChatReport({ reporterId, reportedUserId, reason, reporterIsParticipant, targetIsParticipant }) {
  if (String(reporterId) === String(reportedUserId)) return 'No podés reportarte a vos mismo';
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 1000) {
    return 'La razón debe tener entre 5 y 1000 caracteres';
  }
  if (!reporterIsParticipant || !targetIsParticipant) {
    return 'Solo los participantes del chat pueden reportar a otro participante';
  }
  return null;
}
