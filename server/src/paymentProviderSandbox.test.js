import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaymentProviderSandbox} from './paymentProviderSandbox.js'
const base={operationId:'fee:contract:client',ownerId:'profile-qa',amountCLP:2990,currency:'CLP',methodId:'fixture-approved'}
const sandbox=()=>createPaymentProviderSandbox({mode:'isolated_test',clock:()=>new Date('2026-11-27T15:00:00Z')})
test('sandbox cannot start in production and never advertises custody',()=>{
 for(const mode of [undefined,'live','production'])assert.throws(()=>createPaymentProviderSandbox({mode}))
 assert.equal(sandbox().realPaymentsEnabled,false);assert.equal(sandbox().supportsCustody,false)
})
test('same operation is idempotent; modified amount or owner is rejected',()=>{
 const s=sandbox(),r=s.create(base);assert.deepEqual(s.create(base),r)
 for(const change of [{amountCLP:4990},{ownerId:'other'},{methodId:'fixture-declined'}])assert.throws(()=>s.create({...base,...change}),/Idempotency/)
 assert.throws(()=>s.query(base.operationId,'other'),/unavailable/)
 assert.throws(()=>s.finish(base.operationId,'other','approved'),/unavailable/)
})
test('approval, decline and cancellation remain distinct simulated outcomes',()=>{
 for(const [methodId,outcome] of [['fixture-approved','approved'],['fixture-declined','declined'],['fixture-approved','cancelled']]){
  const s=sandbox(),r=s.create({...base,methodId});assert.equal(r.status,'pending')
  const done=s.finish(base.operationId,base.ownerId,outcome)
  assert.equal(done.status,outcome);assert.equal(done.realPayment,false)
  assert.deepEqual(s.finish(base.operationId,base.ownerId,outcome),done)
  assert.deepEqual(s.query(base.operationId,base.ownerId),done)
  assert.throws(()=>s.finish(base.operationId,base.ownerId,outcome==='cancelled'?'approved':'cancelled'))
 }
})
test('unknown methods, invalid amounts and currencies cannot start an attempt',()=>{
 for(const change of [{methodId:'card-number'},{amountCLP:0},{amountCLP:2.5},{currency:'USD'}])assert.throws(()=>sandbox().create({...base,...change}))
})
