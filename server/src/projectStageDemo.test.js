import test from 'node:test'
import assert from 'node:assert/strict'
import {stageReady,readStageDemo,changeStageDemo,validateStageAction} from './projectStageDemo.js'
const client={id:'c',role:'Cliente'},provider={id:'p',role:'Empresa'},other={id:'o',role:'Cliente'}
const a={version:3,data:{stages:[['Uno','2027-01-01',120000],['Dos','2027-01-02',250000],['Tres','2027-01-03',100000]]},clientConfirmedAt:'now',providerConfirmedAt:'now'}
const contract={revision:1,digest:'a'.repeat(64),mode:'notary',clientSignedAt:'now',providerSignedAt:'now',notaryAcceptedAt:'now',notaryDemoPaidAt:'now',notaryDemoFee:33490,notaryDemoAuthorizedAt:'now'}
const action=(name,stageNo=1)=>({action:name,stageNo,agreementVersion:3,contractRevision:1,digest:contract.digest,accepted:true})
function fake(agreement=a){
 const rows=[],c=structuredClone(contract)
 async function query(sql,p=[]){
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]}
  if(sql.startsWith('SELECT id,sender_profile_id'))return {rows:p[0]==='m'&&['c','p'].includes(p[1])?[{id:'m',senderId:'c',recipientId:'p'}]:[]}
  if(sql.startsWith('SELECT version,data'))return {rows:[agreement]}
  if(sql.startsWith('SELECT revision,agreement_version'))return {rows:[c]}
  if(sql.startsWith('SELECT stage_no'))return {rows:structuredClone(rows)}
  if(sql.startsWith('INSERT INTO matchter.project_stage_demos')){const r={stageNo:p[3],amount:String(p[4]),fundedAt:'now',deliveredAt:null,releasedAt:null};rows.push(r);return {rows:[structuredClone(r)]}}
  if(sql.startsWith('UPDATE matchter.project_contract_demos SET provider_fee_demo_paid_at')){c.providerFeePaidAt=p[3];c.providerFeeStageNo=p[4];return {rows:[{providerFeePaidAt:p[3],providerFeeStageNo:p[4]}]}}
  if(sql.startsWith('UPDATE matchter.project_stage_demos')){const r=rows.find(x=>x.stageNo===p[3]);r[sql.includes('SET delivered_at')?'deliveredAt':'releasedAt']='now';return {rows:[structuredClone(r)]}}
  throw Error(sql)
 }
 return {rows,c,query,async connect(){return {query,release(){}}}}
}
test('contract gate requires signatures and, for notarial mode, paid and authorized demo',()=>{
 assert.ok(stageReady(contract));for(const field of ['clientSignedAt','providerSignedAt','notaryAcceptedAt','notaryDemoPaidAt','notaryDemoFee','notaryDemoAuthorizedAt'])assert.equal(stageReady({...contract,[field]:null}),false)
 assert.ok(stageReady({...contract,mode:'simple',notaryDemoAuthorizedAt:null}))
 assert.equal(stageReady({...contract,mode:'none'}),false)
})
test('stage actions reject client-supplied amounts, wrong versions and missing explicit consent',()=>{
 assert.doesNotThrow(()=>validateStageAction(action('fund')))
 for(const b of [{...action('fund'),amount:1},{...action('fund'),stageNo:51},{...action('fund'),accepted:false},{...action('fund'),digest:'bad'},{...action('fund'),action:'real'}])assert.throws(()=>validateStageAction(b),{status:400})
})
test('ordered stage flow enforces actual participants and roles, server amounts and idempotency',async()=>{
 const db=fake()
 assert.equal((await readStageDemo(db,client,'m')).currentStage,1)
 await assert.rejects(readStageDemo(db,other,'m'),{status:404})
 db.c.notaryDemoAuthorizedAt=null;await assert.rejects(changeStageDemo(db,client,'m',action('fund')),{status:409});db.c.notaryDemoAuthorizedAt='now'
 await assert.rejects(changeStageDemo(db,provider,'m',action('fund')),{status:403})
 await assert.rejects(changeStageDemo(db,client,'m',action('fund',2)),{status:409})
 await assert.rejects(changeStageDemo(db,client,'m',{...action('fund'),contractRevision:2}),{status:409})
 await assert.rejects(changeStageDemo(db,provider,'m',action('deliver')),{status:409})
 await assert.rejects(changeStageDemo(db,client,'m',action('release')),{status:409})
 for(let i=1;i<=3;i++){
  const paid=await changeStageDemo(db,client,'m',action('fund',i))
  assert.equal(paid.stages[i-1].amount,a.data.stages[i-1][2]);assert.equal(db.rows.length,i)
  assert.deepEqual(await changeStageDemo(db,client,'m',action('fund',i)),paid)
  await assert.rejects(changeStageDemo(db,client,'m',action('deliver',i)),{status:403})
  await assert.rejects(changeStageDemo(db,client,'m',action('release',i)),{status:409})
  await changeStageDemo(db,provider,'m',action('deliver',i))
  await assert.rejects(changeStageDemo(db,provider,'m',action('release',i)),{status:403})
  const released=await changeStageDemo(db,client,'m',action('release',i))
  assert.equal(released.currentStage,i===3?null:i+1);assert.equal(released.complete,i===3)
  assert.deepEqual(await changeStageDemo(db,client,'m',action('release',i)),released)
 }
 assert.equal((await readStageDemo(db,provider,'m')).complete,true)
})

test('single-stage and five-stage contracts complete in order; unknown stages cannot be funded',async()=>{
 for(const count of [1,5]){
  const agreement={...a,data:{stages:Array.from({length:count},(_,i)=>['Hito '+(i+1),'2027-01-01',100000+i,100/count])}}
  const db=fake(agreement)
  await assert.rejects(changeStageDemo(db,client,'m',action('fund',count+1)),{status:400})
  for(let i=1;i<=count;i++){
   const funded=await changeStageDemo(db,client,'m',action('fund',i))
   assert.equal(funded.stages[i-1].physicalPercent,100/count)
   await changeStageDemo(db,provider,'m',action('deliver',i))
   const released=await changeStageDemo(db,client,'m',action('release',i))
   assert.equal(released.complete,i===count)
   assert.equal(released.currentStage,i===count?null:i+1)
  }
  assert.equal(db.rows.length,count)
 }
})

test('new contracts require the separate service-fee receipt; legacy contracts remain valid',()=>{
 const c={...contract,terms:{serviceFee:{amount:2990}}};assert.equal(stageReady(c),false);assert.equal(stageReady({...c,serviceFeePaidAt:'now'}),true);assert.equal(stageReady(contract),true)
})

test('deferred fee is never deducted at deposit, only once at first sufficient release',async()=>{
 const db=fake({...a,data:{stages:[['Uno','2027-01-01',1000],['Dos','2027-01-02',100000],['Tres','2027-01-03',100000]]}})
 Object.assign(db.c,{terms:{serviceFee:{version:2,amount:2990}},serviceFeePaidAt:'now',providerFeeMode:'deferred'})
 for(let i=1;i<=3;i++){
  const funded=await changeStageDemo(db,client,'m',action('fund',i))
  assert.equal(funded.stages[i-1].providerFeeDeduction,0)
  assert.equal(funded.stages[i-1].pendingProviderFeeDeduction,i===2?2990:0)
  await changeStageDemo(db,provider,'m',action('deliver',i))
  const released=await changeStageDemo(db,client,'m',action('release',i))
  assert.equal(released.stages[i-1].providerFeeDeduction,i===2?2990:0)
  assert.equal(released.stages[i-1].providerNetReleased,i===2?97010:i===1?1000:100000)
  assert.deepEqual(await changeStageDemo(db,client,'m',action('release',i)),released)
 }
 assert.equal(db.c.providerFeeStageNo,2)
})
test('upfront tariff never deducts from any release',async()=>{
 const db=fake();Object.assign(db.c,{terms:{serviceFee:{version:2,amount:2990}},serviceFeePaidAt:'now',providerFeeMode:'upfront',providerFeePaidAt:'now'})
 await changeStageDemo(db,client,'m',action('fund'));await changeStageDemo(db,provider,'m',action('deliver'))
 const r=await changeStageDemo(db,client,'m',action('release'));assert.equal(r.stages[0].providerNetReleased,120000);assert.equal(r.stages[0].providerFeeDeduction,0)
})
