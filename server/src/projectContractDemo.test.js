import test from 'node:test'
import assert from 'node:assert/strict'
import {contractSnapshot,validateContractAction,readContractDemo,changeContractDemo} from './projectContractDemo.js'
const client={id:'c',role:'Cliente'},provider={id:'p',role:'Empresa'},other={id:'x',role:'Cliente'},id='match'
const agreement={version:2,data:{title:'Terraza',scope:'Construcción de terraza según especificaciones',start:'2027-02-01',end:'2027-02-20',stages:[['A','2027-02-02',100],['B','2027-02-10',200],['C','2027-02-20',300]]},clientConfirmedAt:'now',providerConfirmedAt:'now'}
const choose=(mode='simple',expectedRevision=0)=>({action:'choose',agreementVersion:2,expectedRevision,mode})
const confirm=c=>({action:'confirm',agreementVersion:2,expectedRevision:c.revision,digest:c.digest,accepted:true,identityDemo:true})
function fake(){
 const rows=[],a=structuredClone(agreement)
 async function query(sql,p=[]){
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]}
  if(sql.startsWith('SELECT id,sender_profile_id'))return {rows:p[0]===id&&['c','p'].includes(p[1])?[{id,senderId:'c',recipientId:'p'}]:[]}
  if(sql.startsWith('SELECT version,data'))return {rows:[a]}
  if(sql.startsWith('SELECT revision,agreement_version'))return {rows:rows.length?[structuredClone(rows.at(-1))]:[]}
  if(sql.startsWith('INSERT INTO matchter.project_contract_demos')){const r={agreementVersion:p[1],revision:p[2],mode:p[3],terms:JSON.parse(p[4]),digest:p[5],createdAt:'now',clientSignedAt:null,providerSignedAt:null};rows.push(r);return {rows:[structuredClone(r)]}}
  if(sql.startsWith('UPDATE matchter.project_contract_demos')){const r=rows.at(-1);r[sql.includes('SET client_signed_at')?'clientSignedAt':'providerSignedAt']='confirmed';return {rows:[structuredClone(r)]}}
  throw Error(sql)
 }
 return {rows,a,query,async connect(){return {query,release(){}}}}
}
test('draft uses exact approved dates, milestones and amount and hashes its version and mode',()=>{
 const a=contractSnapshot(id,agreement,'simple',1)
 assert.match(a.terms.clauses[3][1],/2027-02-01.*2027-02-20/)
 assert.match(a.terms.clauses[2][1],/\$600 CLP/)
 assert.equal(a.digest,contractSnapshot(id,agreement,'simple',1).digest)
 assert.notEqual(a.digest,contractSnapshot(id,agreement,'notary',1).digest)
 assert.notEqual(a.digest,contractSnapshot(id,agreement,'simple',2).digest)
})
test('strict test-only actions require explicit acceptance and digest',()=>{
 assert.doesNotThrow(()=>validateContractAction(choose()))
 const good=confirm({revision:1,digest:'a'.repeat(64)})
 assert.doesNotThrow(()=>validateContractAction(good))
 for(const b of [{...good,accepted:false},{...good,identityDemo:false},{...good,actorId:'p'},{...good,digest:'bad'},{...choose(),mode:'real'}])assert.throws(()=>validateContractAction(b),{status:400})
})
test('only accepted participants can choose and confirm the same immutable demo contract',async()=>{
 const db=fake()
 assert.equal((await readContractDemo(db,client,id)).contract,null)
 await assert.rejects(readContractDemo(db,other,id),{status:404})
 db.a.providerConfirmedAt=null
 await assert.rejects(changeContractDemo(db,client,id,choose()),{status:409})
 db.a.providerConfirmedAt='now'
 const first=(await changeContractDemo(db,client,id,choose())).contract
 const second=(await changeContractDemo(db,provider,id,choose('notary',1))).contract
 assert.equal(second.revision,2)
 await assert.rejects(changeContractDemo(db,client,id,confirm(first)),{status:409})
 await assert.rejects(changeContractDemo(db,other,id,confirm(second)),{status:404})
 await assert.rejects(changeContractDemo(db,client,id,{...confirm(second),digest:'f'.repeat(64)}),{status:409})
 const signed=(await changeContractDemo(db,client,id,confirm(second))).contract
 assert.ok(signed.confirmed.client);assert.equal(signed.confirmed.provider,null)
 await assert.rejects(changeContractDemo(db,provider,id,choose('simple',2)),{status:409})
 const both=(await changeContractDemo(db,provider,id,confirm(second))).contract
 assert.ok(both.confirmed.client&&both.confirmed.provider)
 assert.deepEqual((await readContractDemo(db,client,id)).contract,both)
 assert.deepEqual((await changeContractDemo(db,provider,id,confirm(second))).contract,both)
 assert.equal(db.rows.length,2)
})
