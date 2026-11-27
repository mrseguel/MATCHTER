import test from 'node:test'
import assert from 'node:assert/strict'
import {createKhipuDemoBankGuard} from './khipuDemoBankGuard.js'
const base='https://payment-api.khipu.com'
const signal=new AbortController().signal
const body={currency:'CLP',amount:2990,transaction_id:'fixture-only'}
const opts={method:'POST',headers:{'x-api-key':'fixture-secret'},redirect:'error',cache:'no-store',signal,body:JSON.stringify(body)}
const demo={name:'Demo Bank',bank_id:'demo1',min_amount:1000}
const json=banks=>new Response(JSON.stringify({banks}),{headers:{'Content-Type':'application/json'}})
const make=fetchImpl=>createKhipuDemoBankGuard({fetchImpl,merchantId:'123',developerAccountConfirmed:true})
test('Khipu guard checks bank every creation and forces the demo bank, no notifications',async()=>{
 const calls=[]
 const guard=make(async(u,o)=>{calls.push([u,o]);return u.endsWith('/banks')?json([demo]):new Response('{}')})
 await guard(base+'/v3/payments',opts)
 assert.equal(calls.length,2);assert.equal(calls[0][0],base+'/v3/banks');assert.equal(calls[0][1].method,'GET')
 assert.equal(calls[0][1].headers['x-api-key'],'fixture-secret')
 assert.deepEqual(JSON.parse(calls[1][1].body),{...body,bank_id:'demo1',send_email:false,send_reminders:false})
 await guard(base+'/v3/payments/abc123def456',{...opts,method:'GET',body:undefined})
 assert.equal(calls.length,3)
})
test('Khipu guard blocks mixed, real, invalid or minimum-exceeding bank lists before POST',async()=>{
 for(const banks of [[],[{...demo,name:'Banco Estado'}],[demo,{...demo,name:'Banco Estado'}],[{...demo,min_amount:3000}],[{...demo,bank_id:'../../'}],[{...demo,min_amount:undefined}]]){
  const calls=[];const guard=make(async u=>{calls.push(u);return json(banks)})
  await assert.rejects(guard(base+'/v3/payments',opts))
  assert.deepEqual(calls,[base+'/v3/banks'])
 }
})
test('guard refuses unconfirmed account, external hosts, callbacks and forced other banks',async()=>{
 assert.throws(()=>createKhipuDemoBankGuard({fetchImpl:async()=>{},merchantId:'123'}))
 let calls=0
 const guard=make(async()=>{calls++;return json([demo])})
 await assert.rejects(guard('https://other.invalid/v3/payments',opts))
 await assert.rejects(guard(base+'/v3/payments',{...opts,body:JSON.stringify({...body,notify_url:'https://other.invalid'})}))
 assert.equal(calls,0)
 await assert.rejects(guard(base+'/v3/payments',{...opts,body:JSON.stringify({...body,bank_id:'real1'})}))
 assert.equal(calls,1)
})
