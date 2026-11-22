// Punto único de acceso a datos. Cambia MockRepository por PrismaRepository
// cuando DATABASE_URL y el esquema estén configurados.
import { professionals, interactions, projects, privateRequests, matches } from './data.js'
export class MockRepository {
  async listProfessionals({category, search} = {}) {
    return professionals.filter(p => (!category || category === 'Todos' || p.category === category || p.tags.includes(category)) &&
      (!search || `${p.name} ${p.company} ${p.category} ${p.zone}`.toLowerCase().includes(search.toLowerCase())))
  }
  async getProfessional(id) { return professionals.find(p => p.id === id || p.id === `p${id}`) || null }
  async createInteraction(data) {
    const item = { id: `i_${Date.now()}`, createdAt: new Date().toISOString(), ...data }
    interactions.push(item); return item
  }
  async listProjects({ category, search } = {}) {
    return projects.filter(project => project.visibility === 'public' && project.status === 'open'
      && (!category || category === 'Todas' || project.category === category)
      && (!search || `${project.title} ${project.category} ${project.zone}`.toLowerCase().includes(search.toLowerCase())))
  }
  async createProject(data) {
    const item = { id: `project_${Date.now()}`, visibility: 'public', status: 'open', createdAt: new Date().toISOString(), ...data }
    projects.unshift(item)
    return item
  }
  async listPrivateRequests({ clientUserId, recipientId } = {}) {
    return privateRequests.filter(request => (!clientUserId || request.clientUserId === clientUserId)
      && (!recipientId || request.recipientId === recipientId))
  }
  async createPrivateRequest(data) {
    const item = { id: `request_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString(), ...data }
    privateRequests.unshift(item)
    return item
  }
  async updatePrivateRequest(id, status, recipientId) {
    const request = privateRequests.find(item => item.id === id)
    if (!request) return null
    if (request.recipientId !== recipientId) return { forbidden: true }
    if (request.status !== 'pending') return { conflict: true, request }
    request.status = status
    if (status === 'accepted') {
      request.acceptedAt = new Date().toISOString()
      request.matchId = `match_${Date.now()}`
      matches.push({ id: request.matchId, privateRequestId: id, createdAt: request.acceptedAt })
    }
    return request
  }
  async dashboard() { return { professionals: professionals.length, interactions: interactions.length, projects: projects.length, pendingPrivateRequests: privateRequests.filter(request => request.status === 'pending').length, matches: matches.length, city: 'Temuco', persistence: 'memory-demo' } }
}
export const repository = new MockRepository()
