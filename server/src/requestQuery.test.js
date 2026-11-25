import test from 'node:test'
import assert from 'node:assert/strict'
import { requestQueryFilters } from './requestQuery.js'

test('GET requests no acepta consultas sin identidad participante ni filtros reconocidos', () => {
  assert.equal(requestQueryFilters({}), null)
  assert.equal(requestQueryFilters({ status: 'pending' }), null)
  assert.equal(requestQueryFilters({ participantId: '   ' }), null)
})

test('GET requests solo extrae identificadores que restringen al participante', () => {
  assert.deepEqual(requestQueryFilters({ participantId: ' client-1 ', status: 'pending' }), {
    clientUserId: '', recipientId: '', participantId: 'client-1',
  })
  assert.deepEqual(requestQueryFilters({ recipientId: '7' }), {
    clientUserId: '', recipientId: '7', participantId: '',
  })
})
