import { professionals, interactions, projects, privateRequests, matches } from './data.js'

const PROFILE_ROLE = id => String(id) === '2' ? 'Empresa' : String(id) === '6' ? 'Profesional' : 'Maestro o contratista'
const normalizeProjectTitle = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
const makeDedupeKey = ({ clientId, providerId, projectId, projectTitle, description, specifications, location, budget, antecedents }) => {
  const identity = projectId
    ? `id:${encodeURIComponent(String(projectId))}`
    : `details:${encodeURIComponent(JSON.stringify([
      normalizeProjectTitle(projectTitle), normalizeProjectTitle(description), normalizeProjectTitle(specifications),
      normalizeProjectTitle(location), budget == null || budget === '' ? '' : String(Number(budget)), normalizeProjectTitle(antecedents),
    ]))}`
  return `${String(clientId)}:${String(providerId)}:${identity}`
}

export class MockRepository {
  constructor(store = {}) {
    this.professionals = store.professionals || professionals
    this.interactions = store.interactions || interactions
    this.projects = store.projects || projects
    this.privateRequests = store.privateRequests || privateRequests
    this.matches = store.matches || matches
  }

  async listProfessionals({ category, search } = {}) {
    return this.professionals.filter(p => (!category || category === 'Todos' || p.category === category || p.tags.includes(category)) &&
      (!search || `${p.name} ${p.company} ${p.category} ${p.zone}`.toLowerCase().includes(search.toLowerCase())))
  }

  async getProfessional(id) { return this.professionals.find(p => p.id === id || p.id === `p${id}`) || null }
  async getProject(id) { return this.projects.find(project => String(project.id) === String(id)) || null }

  async createInteraction(data) {
    const item = { id: `i_${Date.now()}`, createdAt: new Date().toISOString(), ...data }
    this.interactions.push(item)
    return item
  }

  async listProjects({ category, search } = {}) {
    return this.projects.filter(project => project.visibility === 'public' && project.status === 'open'
      && (!category || category === 'Todas' || project.category === category)
      && (!search || `${project.title} ${project.category} ${project.zone}`.toLowerCase().includes(search.toLowerCase())))
  }

  async createProject(data) {
    const item = { visibility: 'public', status: 'open', createdAt: new Date().toISOString(), ...data, id: data.id || `project_${Date.now()}` }
    if (this.projects.some(project => String(project.id) === String(item.id))) return { conflict: true, project: this.projects.find(project => String(project.id) === String(item.id)) }
    this.projects.unshift(item)
    return item
  }

  async listPrivateRequests({ clientUserId, recipientId, participantId } = {}) {
    if (![clientUserId, recipientId, participantId].some(value => String(value || '').trim())) return []
    return this.privateRequests.filter(request => (!clientUserId || String(request.clientId) === String(clientUserId))
      && (!recipientId || String(request.recipientId) === String(recipientId))
      && (!participantId || String(request.senderId) === String(participantId) || String(request.recipientId) === String(participantId)))
  }

  async createPrivateRequest(data) {
    const { requestKind, senderId, senderRole, recipientId, recipientRole, clientId, providerId, projectTitle, description, specifications, location } = data
    if (!requestKind || !senderId || !senderRole || !recipientId || !recipientRole || !clientId || !providerId
      || !projectTitle?.trim() || !description?.trim() || !specifications?.trim() || !location?.trim()) return { invalid: true }
    if (data.budget !== '' && data.budget != null && (!Number.isFinite(Number(data.budget)) || Number(data.budget) < 0)) return { invalid: true }

    const provider = await this.getProfessional(providerId)
    if (!provider) return { notFound: true, message: 'Profesional o empresa no encontrado' }
    const expectedRole = PROFILE_ROLE(provider.id.replace(/^p/, ''))
    if (requestKind === 'profile_invitation') {
      if (senderRole !== 'Cliente' || String(senderId) !== String(clientId)
        || String(recipientId) !== String(providerId) || recipientRole !== expectedRole) return { forbidden: true }
    } else if (requestKind === 'project_interest') {
      const project = await this.getProject(data.projectId)
      if (!project) return { notFound: true, message: 'Proyecto público no encontrado' }
      if (project.visibility !== 'public' || project.status !== 'open' || String(project.ownerId) !== String(clientId)
        || String(recipientId) !== String(clientId) || recipientRole !== 'Cliente'
        || String(senderId) !== String(providerId) || senderRole !== expectedRole) return { forbidden: true }
    } else return { invalid: true }

    const dedupeKey = makeDedupeKey(data)
    const duplicate = this.privateRequests.find(request => request.dedupeKey === dedupeKey)
    if (duplicate?.status === 'pending') return { duplicate: true, request: duplicate }
    if (duplicate || this.matches.some(match => match.dedupeKey === dedupeKey)) return { conflict: true, request: duplicate }

    const item = {
      id: data.id || `request_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...data,
      dedupeKey,
      budget: data.budget === '' || data.budget == null ? null : Number(data.budget),
    }
    this.privateRequests.unshift(item)
    return item
  }

  async updatePrivateRequest(id, status, actorId, actorRole) {
    const request = this.privateRequests.find(item => String(item.id) === String(id))
    if (!request) return null
    if (String(request.recipientId) !== String(actorId) || request.recipientRole !== actorRole) return { forbidden: true }
    if (request.status === status) return { ...request, duplicate: true }
    if (request.status !== 'pending') return { conflict: true, request }
    if (!['accepted', 'rejected'].includes(status)) return { invalid: true }
    if (status === 'rejected') {
      request.status = 'rejected'
      request.respondedAt = new Date().toISOString()
      return request
    }
    const existingMatch = this.matches.find(match => match.dedupeKey === request.dedupeKey || match.privateRequestId === request.id)
    if (existingMatch) return { conflict: true, match: existingMatch }
    request.status = 'accepted'
    request.acceptedAt = new Date().toISOString()
    request.matchId = `match_${request.id}`
    this.matches.push({
      id: request.matchId,
      privateRequestId: request.id,
      dedupeKey: request.dedupeKey,
      clientId: request.clientId,
      providerId: request.providerId,
      projectId: request.projectId || null,
      createdAt: request.acceptedAt,
    })
    return request
  }

  async dashboard() {
    return {
      professionals: this.professionals.length,
      interactions: this.interactions.length,
      projects: this.projects.length,
      pendingPrivateRequests: this.privateRequests.filter(request => request.status === 'pending').length,
      matches: this.matches.length,
      city: 'Temuco',
      persistence: 'memory-demo',
    }
  }
}

export const repository = new MockRepository()
