import { isYouTubeUrl } from '../validators/profile.js';

export function validateLevelInput(body, aredlLevels = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Los datos del nivel no son válidos';
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
    return 'El nombre es obligatorio y debe tener hasta 100 caracteres';
  }
  if (typeof body.showcase_url !== 'string' || !body.showcase_url.trim() || body.showcase_url.length > 2048 || !isYouTubeUrl(body.showcase_url.trim())) {
    return 'Ingresá un enlace HTTPS válido de YouTube';
  }
  if (!['CLASSIC', 'PLATFORMER'].includes(body.game_mode)) return 'Elegí una modalidad válida';
  if (!Number.isInteger(body.difficulty_estimate) || body.difficulty_estimate < 1 || body.difficulty_estimate > 10000) {
    return 'La dificultad estimada debe ser un Top entre 1 y 10000';
  }
  if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 2000)) {
    return 'La descripción debe tener hasta 2000 caracteres';
  }
  if (body.image_data !== undefined && body.image_data !== null && body.image_data !== '') {
    if (typeof body.image_data !== 'string' || !/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.image_data)) {
      return 'La imagen debe ser JPG o WebP válida';
    }
    const encoded = body.image_data.slice(body.image_data.indexOf(',') + 1);
    if (Buffer.from(encoded, 'base64').length > 4 * 1024 * 1024) return 'La imagen optimizada no puede superar 4 MB';
  }

  const rawRequiredHardestId = body.minimum_hardest_aredl_id;
  const requiredHardestId = rawRequiredHardestId === undefined || rawRequiredHardestId === null || rawRequiredHardestId === ''
    ? null
    : rawRequiredHardestId;
  if (requiredHardestId !== null && (typeof requiredHardestId !== 'string' || !aredlLevels.some((level) => level.id === requiredHardestId))) {
    return 'El hardest mínimo debe elegirse de la lista AREDL de la modalidad seleccionada';
  }
  return null;
}

export function meetsHardestRequirement(playerPosition, requiredPosition) {
  if (requiredPosition === null || requiredPosition === undefined) return true;
  return Number.isInteger(playerPosition) && Number.isInteger(requiredPosition) && playerPosition <= requiredPosition;
}

export function canCreatorMarkLevelVerified({ creatorId, userId, status, acceptedVerifierCount }) {
  return String(creatorId) === String(userId)
    && status === 'IN_PROGRESS'
    && Number(acceptedVerifierCount) > 0;
}

export function applicationsOpenAfterVerifierAcceptance(currentValue) {
  return currentValue === true;
}

export function getApplicationStatusForLevel({ openVerification }) {
  return openVerification === true ? 'ACCEPTED' : 'PENDING';
}

export function canReceiveApplication({ status, applicationsOpen, applications_open }) {
  return (applicationsOpen ?? applications_open) === true && ['AVAILABLE', 'IN_PROGRESS'].includes(status);
}

export function canCreatorWithdrawLevel({ creatorId, userId, status, acceptedVerifierCount }) {
  return String(creatorId) === String(userId)
    && status === 'AVAILABLE'
    && Number(acceptedVerifierCount) === 0;
}

export function canCreatorCloseApplications({ creatorId, userId, status, applicationsOpen }) {
  return String(creatorId) === String(userId)
    && ['AVAILABLE', 'IN_PROGRESS'].includes(status)
    && applicationsOpen === true;
}

export function canCreatorRestoreLevel({ creatorId, userId, status, acceptedVerifierCount }) {
  return String(creatorId) === String(userId)
    && status === 'CANCELLED'
    && Number(acceptedVerifierCount) === 0;
}

export function canCreatorRemoveAcceptedVerifier({ creatorId, userId, status, applicationStatus }) {
  return String(creatorId) === String(userId)
    && status === 'IN_PROGRESS'
    && applicationStatus === 'ACCEPTED';
}

export function canCreatorDeleteCancelledLevel({ creatorId, userId, status }) {
  return String(creatorId) === String(userId) && status === 'CANCELLED';
}

export function isLevelId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)) return false;
  return BigInt(value) <= 9223372036854775807n;
}
