export function canAccessAdministration(role) {
  return role === 'ADMIN' || role === 'OWNER';
}

export function canPromoteToAdmin({ actorRole, targetRole }) {
  return actorRole === 'OWNER' && targetRole === 'USER';
}

export function canReviewLevel({ actorRole, levelStatus, decision }) {
  return canAccessAdministration(actorRole)
    && levelStatus === 'PENDING_REVIEW'
    && ['APPROVE', 'REJECT'].includes(decision);
}
