import test from 'node:test'
import assert from 'node:assert/strict'
import {recordDirectStage,readDirectStageEvents,directStageView} from './directStageService.js'
import {serviceFeeReady} from './serviceFeeDemo.js'
import {contractSnapshot} from './projectContractDemo.js'
import {workflowSnapshot} from './projectWorkflow.js'
const a={version:1,clientConfirmedAt:'2026-11-26',providerConfirmedAt:'2026-11-26',data:{title:'Obra',stages:[['Uno','2027-01-01',100000,100]]}}
const c={agreementVersion:1,revision:1,digest:'a'.repeat(64),mode:'simple',terms:{paymentMode:'direct',serviceFee:{version:2,amount:2990}},clientSignedAt:'2026-11-26',providerSignedAt:'2026-11-26',serviceFeePaidAt:'2026-11-26',providerFeeMode:'upfront',providerFeePaidAt:'2026-11-26'}
const action=(action,progressPercent)=>({action,stageNo:1,agreementVersion:1,contractRevision:1,digest:c.digest,accepted:true,...(progressPercent===undefined?{}:{progressPercent})})
function fake(){
 const events=[]
 return {events,async query(sql,p){
  assert.ok(sql.includes('matchter.project_direct_stage_events'))
  if(sql.startsWith('SELECT'))return {rows:structuredClone(events)}
  assert.ok(sql.startsWith('INSERT'))
  const event={stageNo:p[3],action:p[4],progressPercent:p[6],at:new Date().toISOString()}
  events.push(event);return {rows:[structuredClone(event)]}
 }}
}
test('direct stage persistence records only physical events and rejects financial actions',async()=>{
 const tx=fake(),p={id:'provider'},u={id:'client'}
 await assert.rejects(recordDirectStage(tx,u,'id',a,c,'client',action('fund')),{status:400})
 await assert.rejects(recordDirectStage(tx,u,'id',a,c,'client',action('start')),{status:403})
 await assert.rejects(recordDirectStage(tx,p,'id',a,c,'provider',{...action('start'),digest:'b'.repeat(64)}),{status:409})
 await recordDirectStage(tx,p,'id',a,c,'provider',action('start'))
 await recordDirectStage(tx,p,'id',a,c,'provider',action('start'))
 await recordDirectStage(tx,p,'id',a,c,'provider',action('progress',50))
 await recordDirectStage(tx,p,'id',a,c,'provider',action('deliver'))
 const result=await recordDirectStage(tx,u,'id',a,c,'client',action('accept'))
 assert.equal(result.complete,true);assert.equal(tx.events.length,4)
 assert.equal(directStageView(a,c,await readDirectStageEvents(tx,'id',a,c)).complete,true)
 await assert.rejects(recordDirectStage(tx,u,'id',a,c,'client',action('release')),{status:400})
})
test('direct contracts require both paid fees, not deduction authorization',()=>{
 assert.equal(serviceFeeReady(c),true)
 assert.equal(serviceFeeReady({...c,providerFeeMode:'deferred',providerFeePaidAt:null}),false)
 assert.equal(serviceFeeReady({...c,providerFeePaidAt:null}),false)
})
test('chat and review follow physical acceptance, without protected payment events',()=>{
 const base={agreements:[a],contracts:[c],providerRole:'Maestro o contratista',side:'client'}
 let snapshot=workflowSnapshot(base)
 assert.equal(snapshot.next.title,'Esperando inicio de etapa 1')
 const directEvents=['start','deliver','accept'].map(action=>({action,stageNo:1,at:'2026-11-26T23:00:00Z'}))
 snapshot=workflowSnapshot({...base,directEvents})
 assert.equal(snapshot.complete,true);assert.equal(snapshot.next.target,'review')
 assert.ok(snapshot.events.some(e=>e.body==='Recepción conforme de etapa 1'))
 assert.ok(snapshot.events.every(e=>!e.body.includes('liberado')&&!e.body.includes('Depósito')))
})

test('direct contract signs payment mode and preserves original fee amount',()=>{
 const fee={version:2,amount:4990,deferAvailable:true}
 const agreement={...a,data:{...a.data,scope:'Trabajos de prueba',start:'2027-01-01',end:'2027-01-01'}}
 const legacy=contractSnapshot('id',agreement,'simple',1,undefined,fee)
 const direct=contractSnapshot('id',agreement,'simple',1,undefined,fee,'direct')
 assert.equal(direct.terms.paymentMode,'direct')
 assert.equal(direct.terms.serviceFee.amount,4990)
 assert.equal(direct.terms.serviceFee.deferAvailable,false)
 assert.notEqual(direct.digest,legacy.digest)
 assert.equal(legacy.terms.paymentMode,undefined)
 assert.throws(()=>contractSnapshot('id',agreement,'simple',1,undefined,fee,'protected'),{status:409})
})
