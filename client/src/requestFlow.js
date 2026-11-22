export const normalizeProjectTitle = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()

export const requestDedupeKey = ({ clientId, providerId, projectId, projectTitle, description, specifications, location, budget, antecedents }) => {
  const identity = projectId
    ? `id:${encodeURIComponent(String(projectId))}`
    : `details:${encodeURIComponent(JSON.stringify([
      normalizeProjectTitle(projectTitle), normalizeProjectTitle(description), normalizeProjectTitle(specifications),
      normalizeProjectTitle(location), budget == null || budget === '' ? '' : String(Number(budget)), normalizeProjectTitle(antecedents),
    ]))}`
  return `${String(clientId)}:${String(providerId)}:${identity}`
}

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
    || { id: request.matchId || `match-${request.id}`, requestId: request.id, dedupeKey, clientId: request.clientId, providerId: request.providerId }
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

export async function submitRequestWithApi(request, createRequest) {
  const saved = await createRequest(request)
  if (!saved || saved.status !== 'pending' || saved.dedupeKey !== request.dedupeKey) {
    throw new Error('La API no confirmó la creación de la solicitud pendiente')
  }
  return { ...request, ...saved, dedupeKey: request.dedupeKey }
}

export async function decideRequestWithApi({ request, status, actor, actorId, matches = [], jobs = [], updateRequest, now }) {
  const preflight = resolveRequest({ request, status, actor, matches, jobs, now })
  if (preflight.error) throw new Error(preflight.error === 'forbidden'
    ? 'Solo el destinatario de esta solicitud puede responder'
    : preflight.error === 'conflict' ? 'Esta solicitud ya fue respondida' : 'La decisión no es válida')

  const saved = await updateRequest(request.id, status, actorId, actor.role)
  if (!saved || String(saved.id) !== String(request.id) || saved.status !== status) {
    throw new Error('La API no confirmó la decisión de la solicitud')
  }
  const canonicalRequest = { ...request, ...saved, dedupeKey: request.dedupeKey, status: 'pending' }
  const transition = resolveRequest({
    request: canonicalRequest,
    status,
    actor,
    matches,
    jobs,
    now: status === 'accepted' ? (saved.acceptedAt || now) : (saved.respondedAt || now),
  })
  if (transition.error) throw new Error(`La API confirmó la decisión, pero no se pudo preparar el estado demo (${transition.error})`)
  return {
    request: { ...transition.request, ...saved, dedupeKey: request.dedupeKey },
    match: transition.match,
    job: transition.job,
    conversation: transition.conversation,
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
    dedupeKey: requestDedupeKey({ clientId, providerId, projectTitle, description: details.description, specifications: details.specifications, location: details.location, budget: details.budget, antecedents: details.antecedents }),
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
    dedupeKey: requestDedupeKey({ clientId, providerId, projectId: project.id, projectTitle: project.title }),
  }
}
