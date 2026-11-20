// Punto único de acceso a datos. Cambia MockRepository por PrismaRepository
// cuando DATABASE_URL y el esquema estén configurados.
import { professionals, interactions } from './data.js'
export class MockRepository {
  async listProfessionals({category, search} = {}) {
    return professionals.filter(p => (!category || category === 'Todos' || p.category === category || p.tags.includes(category)) &&
      (!search || `${p.name} ${p.company} ${p.category} ${p.zone}`.toLowerCase().includes(search.toLowerCase())))
  }
  async getProfessional(id) { return professionals.find(p => p.id === id) || null }
  async createInteraction(data) {
    const item = { id: `i_${Date.now()}`, createdAt: new Date().toISOString(), ...data }
    interactions.push(item); return item
  }
  async dashboard() { return { professionals: professionals.length, interactions: interactions.length, city: 'Temuco' } }
}
export const repository = new MockRepository()
