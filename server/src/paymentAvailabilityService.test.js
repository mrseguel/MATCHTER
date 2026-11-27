import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaymentAvailabilityService} from './paymentAvailabilityService.js'
function fixture({admin=true}={}){
 const calls=[]
 const db={async query(sql,args){calls.push([sql,args]);if(sql.includes('JOIN matchter.payment_administrators'))return {rows:admin?[{id:'admin-id'}]:[]};if(sql.startsWith('SELECT availability'))return {rows:[]};if(sql.startsWith('INSERT'))throw Error('Unexpected write');return {rows:[]}},async connect(){return {...this,release(){}}}}
 const service=createPaymentAvailabilityService({db,verifyIdentity:async()=>({issuer:'https://test.neon.tech',subject:'verified-account'})})
 return {service,calls,db}
}
test('administrator is verified by account membership, not a profile label',async()=>{
 const {service,calls}=fixture({admin:false})
 await assert.rejects(service.access('token'),{status:403})
 await assert.rejects(service.get('token'),{status:403})
 await assert.rejects(service.save('token',{availability:'direct-only',revision:'0'}),{status:403})
 assert.ok(calls.every(([sql])=>sql.includes('payment_administrators')))
})
test('new contracts use direct mode only; custody remains unavailable',async()=>{
 const {service,db}=fixture()
 assert.deepEqual(await service.get('token'),{availability:'direct-only',revision:'0',verifiedCustody:false,modes:['direct']})
 assert.equal(await service.modeForNewContract(db),'direct')
 for(const availability of ['both','protected-only'])await assert.rejects(service.save('token',{availability,revision:'0'}),{status:409})
 await assert.rejects(service.save('token',{availability:'both',revision:'0',verifiedCustody:true}),{status:400})
})
test('same setting is idempotent and stale revisions are rejected under a transaction lock',async()=>{
 const {service,calls}=fixture()
 assert.equal((await service.save('token',{availability:'direct-only',revision:'0'})).availability,'direct-only')
 await assert.rejects(service.save('token',{availability:'direct-only',revision:'1'}),{status:409})
 assert.ok(calls.some(([sql])=>sql.includes('pg_advisory_xact_lock')))
 assert.ok(calls.some(([sql])=>sql==='COMMIT'))
 assert.ok(calls.some(([sql])=>sql==='ROLLBACK'))
 assert.ok(calls.every(([sql])=>!sql.startsWith('INSERT')))
})
