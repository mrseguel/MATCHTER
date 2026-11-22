import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProfileRequest, buildProjectInterestRequest, canRespondToRequest, requestDedupeKey, resolveRequest } from './requestFlow.js'

test('formulario de invitación registra todos los antecedentes como solicitud pendiente', () => {
  const request = buildProfileRequest({
    client: { id: 'demo-client', name: 'Francisca', loc: 'Temuco Centro' },
    provider: { id: 6, name: 'María Gómez' },
    details: { projectTitle: 'Cocina', description: 'Remodelación completa', specifications: '25 m² y muebles nuevos', location: 'Temuco', budget: '', antecedents: 'Visita por coordinar' },
  })
  assert.equal(request.status, 'pending')
  assert.equal(request.recipientRole, 'Profesional')
  assert.equal(request.description, 'Remodelación completa')
  assert.equal(request.specifications, '25 m² y muebles nuevos')
  assert.equal(request.location, 'Temuco')
  assert.equal(request.budget, null)
  assert.equal(request.antecedents, 'Visita por coordinar')
  assert.equal('match' in request, false)
  assert.equal('job' in request, false)
})

test('ME INTERESA en perfil se dirige al proveedor y requiere a ese destinatario', () => {
  const request = buildProfileRequest({
    client: { id: 'demo-client', name: 'Francisca' },
    provider: { id: 2, name: 'Instalaciones Sur' },
    details: { projectTitle: 'Tablero eléctrico', description: 'Normalizar', specifications: 'Tablero domiciliario', location: 'Temuco' },
  })
  assert.equal(request.recipientId, '2')
  assert.equal(request.recipientRole, 'Empresa')
  assert.equal(canRespondToRequest(request, { role: 'Empresa', profileIds: [2] }), true)
  assert.equal(canRespondToRequest(request, { role: 'Cliente', clientId: 'demo-client' }), false)
  assert.equal(canRespondToRequest(request, { role: 'Empresa', profileIds: [3] }), false)
})

test('ME INTERESA en proyecto público se envía al cliente propietario', () => {
  const request = buildProjectInterestRequest({
    project: { id: 'project-1', ownerId: 'client-rodrigo', ownerName: 'Rodrigo', title: 'Techo', description: 'Reparación', category: 'Obra gruesa', zone: 'Temuco', budget: 500000, area: '20 m²' },
    provider: { id: 1, name: 'Carlos' },
    role: 'Maestro o contratista',
    details: { message: 'Tengo disponibilidad', budget: '' },
  })
  assert.equal(request.status, 'pending')
  assert.equal(request.recipientId, 'client-rodrigo')
  assert.equal(request.senderId, '1')
  assert.equal(request.budget, null)
  assert.equal(request.projectBudget, 500000)
  assert.equal(canRespondToRequest(request, { role: 'Cliente', clientId: 'client-rodrigo' }), true)
  assert.equal(canRespondToRequest(request, { role: 'Cliente', clientId: 'demo-client' }), false)
  assert.equal(canRespondToRequest(request, { role: 'Maestro o contratista', profileIds: [1] }), false)
})

test('la clave normalizada identifica como duplicadas variantes de mayúsculas y tildes', () => {
  const a = requestDedupeKey({ clientId: 'c1', providerId: 'p1', projectTitle: 'Remodelación Cocina' })
  const b = requestDedupeKey({ clientId: 'c1', providerId: 'p1', projectTitle: '  remodelacion   cocina ' })
  assert.equal(a, b)
})

test('la aceptación produce un único Match, trabajo y conversación; un actor incorrecto no puede hacerlo', () => {
  const request = buildProjectInterestRequest({
    project: { id: 'project-1', ownerId: 'client-rodrigo', ownerName: 'Rodrigo', title: 'Techo', description: 'Reparación', zone: 'Temuco', area: '20 m²' },
    provider: { id: 1, name: 'Carlos' }, role: 'Maestro o contratista', details: { message: 'Disponible' },
  })
  request.id = 'request-1'
  const unauthorized = resolveRequest({ request, status: 'accepted', actor: { role: 'Cliente', clientId: 'demo-client' } })
  assert.equal(unauthorized.error, 'forbidden')

  const accepted = resolveRequest({ request, status: 'accepted', actor: { role: 'Cliente', clientId: 'client-rodrigo' }, now: '2026-01-01T00:00:00.000Z' })
  assert.equal(accepted.request.status, 'accepted')
  assert.equal(accepted.match.requestId, 'request-1')
  assert.equal(accepted.job.matchId, accepted.match.id)
  assert.deepEqual(accepted.conversation, [])

  const acceptedAgain = resolveRequest({ request: accepted.request, status: 'accepted', actor: { role: 'Cliente', clientId: 'client-rodrigo' } })
  assert.equal(acceptedAgain.error, 'conflict')
})

test('el rechazo deja solicitud rechazada y no produce Match, trabajo ni chat', () => {
  const request = buildProfileRequest({
    client: { id: 'demo-client', name: 'Francisca' }, provider: { id: 1, name: 'Carlos' },
    details: { projectTitle: 'Baño', description: 'Remodelar', specifications: 'Ducha nueva', location: 'Temuco' },
  })
  request.id = 'request-rejected'
  const rejected = resolveRequest({ request, status: 'rejected', actor: { role: 'Maestro o contratista', profileIds: [1] } })
  assert.equal(rejected.request.status, 'rejected')
  assert.equal(rejected.match, null)
  assert.equal(rejected.job, null)
  assert.equal(rejected.conversation, null)
})
