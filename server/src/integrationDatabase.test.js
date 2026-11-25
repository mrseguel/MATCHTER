import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createIntegrationPool, verifyPersistence } from './integrationDatabase.js'

test('integration uses restricted role, validates TLS and rejects missing credentials', () => {
  class FakePool { constructor(options) { this.options = options } }
  assert.throws(() => createIntegrationPool({},FakePool), /not configured/)
  assert.throws(() => createIntegrationPool({MATCHTER_INTEGRATION_DATABASE_URL:'postgresql://neondb_owner:x@example.neon.tech/neondb?sslmode=require'},FakePool))
  const pool = createIntegrationPool({MATCHTER_INTEGRATION_DATABASE_URL:'postgresql://matchter_probe:fake@example.neon.tech/neondb?sslmode=require'},FakePool)
  assert.equal(pool.options.ssl.rejectUnauthorized,true)
  assert.equal(pool.options.max,1)
  assert.equal(new URL(pool.options.connectionString).searchParams.has('sslmode'),false)
})
test('probe writes and reads with separate pools and closes both',async () => {
  let saved,opened=0,closed=0
  const makePool=()=>{opened++;return {query:async(sql,params)=>{
    assert.deepEqual(params,['vercel-integration'])
    if(sql.startsWith('INSERT')) saved='test-time'
    return {rows:[{checked_at:saved}]}
  },end:async()=>{closed++}}}
  assert.deepEqual(await verifyPersistence(makePool),{persisted:true})
  assert.equal(opened,2);assert.equal(closed,2)
})
test('probe rejects different data after write',async () => {
  let opened=0
  await assert.rejects(verifyPersistence(()=>{const index=++opened;return {query:async()=>({rows:[{checked_at:String(index)}]}),end:async()=>{}}}),/does not match/)
})
