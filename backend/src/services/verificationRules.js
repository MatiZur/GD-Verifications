import { isYouTubeUrl } from '../validators/profile.js';

export function validateVerificationSubmission({ verifierId, publicLevelId, videoUrl, acceptedVerifiers = [] }) {
  if (!acceptedVerifiers.some((verifier) => String(verifier.verifier_id) === String(verifierId))) {
    return 'Elegí un verificador aceptado para esta entrega';
  }
  if (typeof publicLevelId !== 'string' || !/^\d{1,30}$/.test(publicLevelId) || /^0+$/.test(publicLevelId)) {
    return 'Ingresá una ID pública de Geometry Dash válida';
  }
  if (typeof videoUrl !== 'string' || videoUrl.length > 2048 || !isYouTubeUrl(videoUrl.trim())) {
    return 'Ingresá un enlace HTTPS válido de YouTube para la verificación';
  }
  return null;
}

export function canReviewVerification({ actorRole, status, decision }) {
  return ['ADMIN', 'OWNER'].includes(actorRole)
    && status === 'PENDING'
    && ['APPROVE', 'REJECT'].includes(decision);
}

export function validateBanDuration(days) {
  return days === null || (Number.isInteger(days) && days >= 1 && days <= 3650);
}
