export const normalizeProjectTitle = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()

export const requestDedupeKey = ({ clientId, providerId, projectTitle }) =>
  `${String(clientId)}:${String(providerId)}:${normalizeProjectTitle(projectTitle)}`

export const providerRoleFor = providerId => String(providerId) === '2'
  ? 'Empresa'
  : String(providerId) === '6' ? 'Profesional' : 'Maestro o contratista'

export function isRequestRecipient(request, { role, clientId, profileIds = [] }) {
  if (!request || request.recipientRole !== role) return false
  if (role === 'Cliente') return String(request.recipientId) === String(clientId)
  return profileIds.map(String).includes(String(request.recipientId))
}

export function canRespondToRequest(request, actor) {
  return request?.status === 'pending' && isRequestRecipient(request, actor)
}

export function resolveRequest({ request, status, actor, matches = [], jobs = [], now = new Date().toISOString() }) {
  if (!isRequestRecipient(request, actor)) return { error: 'forbidden' }
  if (request.status !== 'pending') return { error: 'conflict' }
  if (!['accepted', 'rejected'].includes(status)) return { error: 'invalid' }
  if (status === 'rejected') return { request: { ...request, status: 'rejected', respondedAt: now }, match: null, job: null, conversation: null }

  const dedupeKey = request.dedupeKey || requestDedupeKey(request)
  const match = matches.find(item => item.dedupeKey === dedupeKey || item.requestId === request.id)
    || { id: `match-${request.id}`, requestId: request.id, dedupeKey, clientId: request.clientId, providerId: request.providerId }
  const job = jobs.find(item => item.projectRef === dedupeKey)
    || {
      id: `job-${dedupeKey}`,
      pid: request.providerId,
      providerId: request.providerId,
      clientId: request.clientId,
      project: request.projectTitle,
      projectRef: dedupeKey,
      privateRequestId: request.id,
      matchId: match.id,
      acceptedAt: now,
      signed: false,
      paid: 0,
    }
  return {
    request: { ...request, status: 'accepted', acceptedAt: now, matchId: match.id },
    match,
    job,
    conversation: [],
  }
}

export function buildProfileRequest({ client, provider, details }) {
  const projectTitle = String(details.projectTitle || '').trim()
  const providerId = String(provider.id)
  const clientId = String(client.id)
  return {
    requestKind: 'profile_invitation',
    senderId: clientId,
    senderRole: 'Cliente',
    recipientId: providerId,
    recipientRole: providerRoleFor(providerId),
    clientId,
    providerId,
    clientName: client.name,
    providerName: provider.name,
    projectId: null,
    projectTitle,
    description: String(details.description || '').trim(),
    specifications: String(details.specifications || '').trim(),
    location: String(details.location || '').trim(),
    zone: String(details.location || '').trim(),
    budget: details.budget === '' || details.budget == null ? null : Number(details.budget),
    antecedents: String(details.antecedents || '').trim(),
    message: String(details.description || '').trim(),
    status: 'pending',
    dedupeKey: requestDedupeKey({ clientId, providerId, projectTitle }),
  }
}

export function buildProjectInterestRequest({ project, provider, role, details = {} }) {
  const clientId = String(project.ownerId)
  const providerId = String(provider.id)
  return {
    requestKind: 'project_interest',
    senderId: providerId,
    senderRole: role,
    recipientId: clientId,
    recipientRole: 'Cliente',
    clientId,
    providerId,
    clientName: project.ownerName,
    providerName: provider.name,
    projectId: String(project.id),
    projectTitle: project.title,
    description: project.description,
    specifications: project.specifications || project.area || '',
    location: project.zone,
    zone: project.zone,
    budget: details.budget === '' || details.budget == null ? null : Number(details.budget),
    projectBudget: project.budget == null ? null : Number(project.budget),
    antecedents: String(details.antecedents || '').trim(),
    message: String(details.message || '').trim(),
    status: 'pending',
    dedupeKey: requestDedupeKey({ clientId, providerId, projectTitle: project.title }),
  }
}
