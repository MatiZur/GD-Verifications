import { isLevelId } from './levelRules.js';

export function validateApplicationSelection(applicationIds) {
  if (!Array.isArray(applicationIds) || applicationIds.length < 1 || applicationIds.length > 100) {
    return 'Seleccioná entre 1 y 100 postulaciones';
  }
  if (applicationIds.some((id) => typeof id !== 'string' || !isLevelId(id))) {
    return 'La selección de postulaciones no es válida';
  }
  if (new Set(applicationIds).size !== applicationIds.length) {
    return 'No repitas postulaciones en la selección';
  }
  return null;
}
