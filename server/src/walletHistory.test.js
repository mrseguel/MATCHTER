import test from 'node:test'
import assert from 'node:assert/strict'
import {walletHistory,readWalletHistory} from './walletHistory.js'
const row={requestId:'request',agreementVersion:1,revision:1,createdAt:'2026-11-26T15:00:00Z',projectTitle:'Obra QA',feeEligible:true,feeAmount:2990,notaryEligible:false}
test('pending and deferred demo authorizations never become recorded payments',()=>{
 for(const mode of [null,'deferred']){
  const w=walletHistory([{...row,feeMode:mode}])
  assert.equal(w.realPaymentsEnabled,false)
  assert.equal(w.movements[0].status,mode?'deferred_demo':'pending_demo')
  assert.equal(w.movements[0].recordedAt,null)
 }
})
test('one stable movement per contract fee, independently of notary charge',()=>{
 const r={...row,feePaidAt:'2026-11-26T16:00:00Z',notaryEligible:true,notaryPaidAt:'2026-11-26T17:00:00Z',notaryPaidAmount:33490}
 const w=walletHistory([r])
 assert.equal(w.movements.length,2)
 assert.equal(w.movements[0].kind,'notary_fee')
 assert.equal(w.movements[1].amountCLP,2990)
 assert.equal(w.movements[1].status,'recorded_demo')
 assert.deepEqual(walletHistory([r]),w)
})
test('invalid amounts and non-obligated profiles do not create movements',()=>{
 assert.deepEqual(walletHistory([{...row,feeAmount:-1},{...row,feeEligible:false}]).movements,[])
})
test('read history is restricted to signed contracts of the actual active profile',async()=>{
 const db={async query(sql,args){assert.deepEqual(args,['profile','Profesional']);assert.match(sql,/r.recipient_profile_id=\$1/);assert.match(sql,/c.client_signed_at IS NOT NULL AND c.provider_signed_at IS NOT NULL/);assert.match(sql,/^SELECT/);return {rows:[{...row,feeAmountText:'2990',feeMode:'deferred'}]}}}
 const w=await readWalletHistory(db,{id:'profile',role:'Profesional'})
 assert.equal(w.movements[0].status,'deferred_demo')
})
