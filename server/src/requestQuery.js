const clean = value => String(value || '').trim()

export function requestQueryFilters(query = {}) {
  const filters = {
    clientUserId: clean(query.clientUserId),
    recipientId: clean(query.recipientId),
    participantId: clean(query.participantId),
  }
  return Object.values(filters).some(Boolean) ? filters : null
}
