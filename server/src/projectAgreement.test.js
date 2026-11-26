import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAgreementAction,readProjectAgreement,changeProjectAgreement} from './projectAgreement.js'
const client={id:'client-1',role:'Cliente'},provider={id:'provider-1',role:'Maestro o contratista'},outsider={id:'other',role:'Cliente'}
const match={id:'match-1',senderId:client.id,recipientId:provider.id}
const terms={title:'Terraza de madera',scope:'Construcción de terraza y terminaciones según especificaciones.',start:'2026-12-01',end:'2026-12-20',stages:[['Preparación','2026-12-03',100000],['Estructura','2026-12-10',200000],['Entrega','2026-12-20',150000]]}
const proposal=(expectedVersion=0,data=terms)=>({action:'propose',expectedVersion,data})
const confirm=expectedVersion=>({action:'confirm',expectedVersion})
function fakeDB(){
 const rows=[];const log=[];let snapshot=[];let tail=Promise.resolve()
 async function query(sql,p=[]){
  log.push(sql)
  if(sql==='BEGIN'){snapshot=rows.map(r=>structuredClone(r));return {rows:[]}}
  if(sql==='COMMIT')return {rows:[]}
  if(sql==='ROLLBACK'){rows.splice(0,rows.length,...snapshot);return {rows:[]}}
  if(sql.startsWith('SELECT id,sender_profile_id'))return {rows:p[0]===match.id&&[client.id,provider.id].includes(p[1])?[match]:[]}
  if(sql.startsWith('SELECT version,data'))return {rows:rows.length?[structuredClone(rows.at(-1))]:[]}
  if(sql.startsWith('INSERT INTO matchter.project_agreement_versions')){
   const row={version:p[1],proposedBy:p[2],data:JSON.parse(p[3]),createdAt:'now',clientConfirmedAt:p[4]==='client'?'now':null,providerConfirmedAt:p[4]==='provider'?'now':null}
   rows.push(row);return {rows:[structuredClone(row)]}
  }
  if(sql.startsWith('UPDATE matchter.project_agreement_versions')){
   const row=rows.find(r=>r.version===p[1]);const col=sql.includes('SET client_confirmed_at')?'clientConfirmedAt':'providerConfirmedAt'
   if(!row||row[col])return {rows:[]};row[col]='confirmed';return {rows:[structuredClone(row)]}
  }
  throw Error('Unexpected SQL '+sql)
 }
 return {rows,log,query,async connect(){let release;const wait=tail;tail=new Promise(r=>{release=r});await wait;return {query,release}}}
}
test('agreement validates real calendar dates, ordered milestones, whole CLP, and strict fields',()=>{
 assert.deepEqual(validateAgreementAction(proposal()).data,terms)
 for(const data of [
 {...terms,start:'2026-02-30'},
 {...terms,end:'2026-11-30'},
 {...terms,stages:terms.stages.slice(0,2)},
 {...terms,stages:terms.stages.map((s,i)=>i===1?[s[0],'2026-12-01',s[2]]:s)},
 {...terms,stages:terms.stages.map((s,i)=>i===1?[s[0],s[1],1.1]:s)},
 {...terms,scope:'Corto'}, {...terms,actorId:provider.id}
 ])assert.throws(()=>validateAgreementAction(proposal(0,data)),{status:400})
 assert.throws(()=>validateAgreementAction({action:'confirm',expectedVersion:0}),{status:400})
 assert.throws(()=>validateAgreementAction({...confirm(1),data:terms}),{status:400})
})
test('only participants can read or write; a proposal confirms the proposer, new versions reset approvals, both confirmations freeze it',async()=>{
 const db=fakeDB()
 assert.deepEqual(await readProjectAgreement(db,client,match.id),{agreement:null})
 await assert.rejects(readProjectAgreement(db,outsider,match.id),{status:404})
 await assert.rejects(changeProjectAgreement(db,outsider,match.id,proposal()),{status:404})
 await assert.rejects(changeProjectAgreement(db,{...client,role:'Empresa'},match.id,proposal()),{status:403})
 const v1=(await changeProjectAgreement(db,client,match.id,proposal())).agreement
 assert.equal(v1.version,1);assert.equal(v1.proposedBy,'client');assert.ok(v1.confirmed.client);assert.equal(v1.confirmed.provider,null)
 const v2=(await changeProjectAgreement(db,provider,match.id,proposal(1,{...terms,title:'Terraza ajustada'}))).agreement
 assert.equal(v2.version,2);assert.equal(v2.proposedBy,'provider');assert.equal(v2.confirmed.client,null);assert.ok(v2.confirmed.provider)
 await assert.rejects(changeProjectAgreement(db,client,match.id,confirm(1)),{status:409})
 const confirmed=(await changeProjectAgreement(db,client,match.id,confirm(2))).agreement
 assert.ok(confirmed.confirmed.client);assert.ok(confirmed.confirmed.provider)
 assert.deepEqual((await changeProjectAgreement(db,client,match.id,confirm(2))).agreement,confirmed)
 await assert.rejects(changeProjectAgreement(db,provider,match.id,proposal(2)),{status:409})
 assert.deepEqual((await readProjectAgreement(db,provider,match.id)).agreement,confirmed)
 assert.equal(db.rows.length,2);assert.equal(db.rows[0].data.title,terms.title)
 assert.ok(db.log.some(s=>s.endsWith('FOR UPDATE')))
})
test('two proposals based on the same version cannot both succeed',async()=>{
 const db=fakeDB()
 const results=await Promise.allSettled([changeProjectAgreement(db,client,match.id,proposal()),changeProjectAgreement(db,provider,match.id,proposal())])
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1)
 assert.equal(results.find(x=>x.status==='rejected').reason.status,409)
 assert.equal(db.rows.length,1)
})
