import test from 'node:test'
import assert from 'node:assert/strict'
import { MockRepository } from './repository.js'

const createRepo = () => new MockRepository({
  professionals: [
    { id: 'p1', name: 'Carlos Muñoz' },
    { id: 'p2', name: 'Instalaciones Sur' },
  ],
  interactions: [],
  projects: [{
    id: 'project-electrical', title: 'Normalización eléctrica', description: 'Actualizar tablero',
    category: 'Electricidad', zone: 'Temuco', budget: 450000, ownerId: 'client-rodrigo',
    ownerName: 'Rodrigo A.', visibility: 'public', status: 'open',
  }],
  privateRequests: [],
  matches: [],
})

const profileInvitation = (overrides = {}) => ({
  id: 'request-profile-1', requestKind: 'profile_invitation',
  senderId: 'demo-client', senderRole: 'Cliente', recipientId: '1', recipientRole: 'Maestro o contratista',
  clientId: 'demo-client', providerId: '1', clientName: 'Francisca Muñoz', providerName: 'Carlos Muñoz',
  projectTitle: 'Baño nuevo', description: 'Remodelar el baño', specifications: 'Cambiar ducha y cerámicos',
  location: 'Temuco · Centro', budget: null, antecedents: '', message: 'Remodelar el baño', ...overrides,
})

const projectInterest = (overrides = {}) => ({
  id: 'request-project-1', requestKind: 'project_interest',
  senderId: '1', senderRole: 'Maestro o contratista', recipientId: 'client-rodrigo', recipientRole: 'Cliente',
  clientId: 'client-rodrigo', providerId: '1', clientName: 'Rodrigo A.', providerName: 'Carlos Muñoz',
  projectId: 'project-electrical', projectTitle: 'Normalización eléctrica', description: 'Actualizar tablero',
  specifications: 'Casa de 110 m²', location: 'Temuco', budget: 420000, antecedents: 'Experiencia en tableros',
  message: 'Puedo visitar esta semana', ...overrides,
})

test('una solicitud privada queda pendiente; solo el profesional destinatario puede aceptarla una vez', async () => {
  const repo = createRepo()
  const pending = await repo.createPrivateRequest(profileInvitation())
  assert.equal(pending.status, 'pending')
  assert.equal(repo.matches.length, 0)

  const wrongActor = await repo.updatePrivateRequest(pending.id, 'accepted', 'demo-client', 'Cliente')
  assert.equal(wrongActor.forbidden, true)
  const wrongProvider = await repo.updatePrivateRequest(pending.id, 'accepted', '3', 'Maestro o contratista')
  assert.equal(wrongProvider.forbidden, true)
  assert.equal(pending.status, 'pending')
  assert.equal(repo.matches.length, 0)

  const accepted = await repo.updatePrivateRequest(pending.id, 'accepted', '1', 'Maestro o contratista')
  assert.equal(accepted.status, 'accepted')
  assert.equal(repo.matches.length, 1)
  assert.equal(repo.matches[0].privateRequestId, pending.id)
  assert.equal('job' in repo.matches[0], false)
  assert.equal('conversation' in repo.matches[0], false)

  const secondAcceptance = await repo.updatePrivateRequest(pending.id, 'accepted', '1', 'Maestro o contratista')
  assert.equal(secondAcceptance.duplicate, true)
  assert.equal(repo.matches.length, 1)
  const secondInvite = await repo.createPrivateRequest(profileInvitation({ id: 'request-profile-duplicate' }))
  assert.equal(secondInvite.conflict, true)
  assert.equal(repo.privateRequests.length, 1)
})

test('rechazar una solicitud no crea Match', async () => {
  const repo = createRepo()
  const pending = await repo.createPrivateRequest(profileInvitation())
  const rejected = await repo.updatePrivateRequest(pending.id, 'rejected', '1', 'Maestro o contratista')
  assert.equal(rejected.status, 'rejected')
  assert.equal(repo.matches.length, 0)
})

test('el interés en proyecto público llega al dueño y solo este puede aceptarlo', async () => {
  const repo = createRepo()
  const pending = await repo.createPrivateRequest(projectInterest())
  assert.equal(pending.status, 'pending')
  assert.equal(pending.recipientId, 'client-rodrigo')
  assert.equal(repo.matches.length, 0)

  const wrongOwner = await repo.updatePrivateRequest(pending.id, 'accepted', 'demo-client', 'Cliente')
  assert.equal(wrongOwner.forbidden, true)
  assert.equal(pending.status, 'pending')

  const accepted = await repo.updatePrivateRequest(pending.id, 'accepted', 'client-rodrigo', 'Cliente')
  assert.equal(accepted.status, 'accepted')
  assert.equal(repo.matches.length, 1)
  assert.equal(repo.matches[0].clientId, 'client-rodrigo')
  assert.equal(repo.matches[0].providerId, '1')
})

test('no permite solicitudes duplicadas para el mismo proyecto y participantes', async () => {
  const repo = createRepo()
  const first = await repo.createPrivateRequest(projectInterest())
  const duplicate = await repo.createPrivateRequest(projectInterest({ id: 'request-project-duplicate' }))
  assert.equal(first.status, 'pending')
  assert.equal(duplicate.duplicate, true)
  assert.equal(duplicate.request.id, first.id)
  assert.equal(repo.privateRequests.length, 1)
  assert.equal(repo.matches.length, 0)
})

test('rechazar el interés de un profesional en un proyecto público no crea Match', async () => {
  const repo = createRepo()
  const pending = await repo.createPrivateRequest(projectInterest())
  const rejected = await repo.updatePrivateRequest(pending.id, 'rejected', 'client-rodrigo', 'Cliente')
  assert.equal(rejected.status, 'rejected')
  assert.equal(repo.matches.length, 0)
})

test('valida que el destinatario de un interés público sea el dueño del proyecto', async () => {
  const repo = createRepo()
  const spoofed = await repo.createPrivateRequest(projectInterest({ recipientId: 'demo-client', clientId: 'demo-client' }))
  assert.equal(spoofed.forbidden, true)
  assert.equal(repo.privateRequests.length, 0)
})

test('las consultas de solicitudes sin participante no devuelven registros y las consultas filtradas sí limitan', async () => {
  const repo = createRepo()
  const clientRequest = await repo.createPrivateRequest(profileInvitation())
  const projectRequest = await repo.createPrivateRequest(projectInterest())
  assert.deepEqual(await repo.listPrivateRequests(), [])
  assert.deepEqual(await repo.listPrivateRequests({ status: 'pending' }), [])
  assert.deepEqual(await repo.listPrivateRequests({ participantId: 'demo-client' }), [clientRequest])
  assert.deepEqual(await repo.listPrivateRequests({ participantId: 'client-rodrigo' }), [projectRequest])
})

test('dos proyectos distintos del mismo cliente pueden compartir título sin colisionar', async () => {
  const repo = createRepo()
  repo.projects.push({ ...repo.projects[0], id: 'project-electrical-copy' })
  const first = await repo.createPrivateRequest(projectInterest())
  const second = await repo.createPrivateRequest(projectInterest({ id: 'request-project-2', projectId: 'project-electrical-copy' }))
  assert.equal(first.status, 'pending')
  assert.equal(second.status, 'pending')
  assert.notEqual(first.dedupeKey, second.dedupeKey)
  assert.equal(repo.privateRequests.length, 2)
  assert.equal(repo.matches.length, 0)
})

test('el servidor controla el estado inicial y conserva la identidad de cada solicitud', async () => {
  const repo = createRepo()
  const request = await repo.createPrivateRequest(profileInvitation({ status: 'accepted', acceptedAt: 'ayer' }))
  assert.equal(request.status, 'pending')
  assert.equal(request.acceptedAt, undefined)
  assert.equal(repo.matches.length, 0)
  const collision = await repo.createPrivateRequest(profileInvitation({ description: 'Otro proyecto' }))
  assert.equal(collision.conflict, true)
  assert.equal(repo.privateRequests.length, 1)
})
