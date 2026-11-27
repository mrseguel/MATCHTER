// Static, deliberately synthetic QA snapshot. No browser identity or write endpoint.
import assert from 'node:assert/strict'
import pg from 'pg'
import {mkdir,writeFile} from 'node:fs/promises'
import {createSandboxContractFeeProjection} from '../server/src/sandboxContractFeeProjection.js'
import {readStageDemo} from '../server/src/projectStageDemo.js'
import {listStageClaims} from '../server/src/stageClaimsService.js'
import {createMediationService} from '../server/src/mediationService.js'
import {createInspectionService} from '../server/src/inspectionService.js'
let db,phase='scope'
try{
 assert.equal(process.env.VERCEL_ENV,'preview')
 const url=new URL(process.env.MATCHTER_DISPUTE_QA_DATABASE_URL)
 assert.equal(decodeURIComponent(url.username),'matchter_dispute_qa_app');assert.equal(url.pathname,'/matchter_payment_qa');assert.ok(url.hostname.endsWith('.neon.tech'));url.searchParams.set('sslmode','verify-full')
 db=new pg.Pool({connectionString:url.href,max:2,connectionTimeoutMillis:10000,statement_timeout:10000})
 const s=(await db.query("SELECT current_database() AS db,current_user AS role,current_setting('neon.branch_id',true) AS branch,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated FROM pg_roles WHERE rolname=current_user")).rows[0]
 assert.deepEqual(s,{db:'matchter_payment_qa',role:'matchter_dispute_qa_app',branch:'br-lively-frog-b691adhk',elevated:false})
 const issuer='https://payment-qa.invalid',subjects={client:'khipu-qa-v1-client',provider:'khipu-qa-v1-provider',mediator:'dispute-qa-mediator',inspector:'dispute-qa-inspector'}
 const rows=(await db.query("SELECT a.auth_subject AS subject,p.id,p.role FROM matchter.accounts a JOIN matchter.account_active_profiles ap ON ap.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=ap.role WHERE a.auth_issuer=$1 AND a.auth_subject=ANY($2::text[])",[issuer,Object.values(subjects)])).rows
 assert.equal(rows.length,4)
 const actors=Object.fromEntries(Object.entries(subjects).map(([k,v])=>[k,rows.find(x=>x.subject===v)]))
 const r=(await db.query("SELECT r.id,r.sender_profile_id,r.recipient_profile_id FROM matchter.sandbox_payment_attempts a JOIN matchter.swipe_requests r ON r.id=a.request_id WHERE a.id=$1 AND r.details->>'projectTitle'='MATCHTER Khipu external QA webhook 3'",['404caf87-a133-4901-ae61-e6393bda0657'])).rows[0]
 assert.equal(r.sender_profile_id,actors.client.id);assert.equal(r.recipient_profile_id,actors.provider.id)
 const verifyIdentity=async h=>{assert.ok(rows.some(x=>x.subject===h));return {issuer,subject:h}}
 const med=createMediationService({db,verifyIdentity,inspectionsEnabled:true}),ins=createInspectionService({db,verifyIdentity}),opts={sandboxFeeProjection:createSandboxContractFeeProjection({db,mode:'isolated_dispute_test'})}
 const data={views:{}},caseId='28b6d099-ead9-48a2-b3f3-2c595f854191',orderId='ebcfa872-e496-476c-b1a6-9cd585de903e'
 phase='participants'
 for(const key of ['client','provider']){
  const a=actors[key],claims=await listStageClaims(db,a,r.id),stages=await readStageDemo(db,a,r.id,opts)
  assert.equal(claims.claims.length,2);assert.ok(claims.claims.every(c=>c.requestId===r.id&&c.description.startsWith('Reclamo ficticio QA:')))
  const v={role:a.role,claims,stages,thread:{id:r.id,project:'Proyecto contractual de prueba',peerName:key==='client'?'Maestro ficticio':'Cliente ficticio',peerRole:key==='client'?'Maestro o contratista':'Cliente'},cases:{},exports:{},inspections:{},conversations:{}}
  for(const c of claims.claims){const q={role:a.role,claimId:c.id};v.cases[c.id]=await med.get(a.subject,q);v.exports[c.id]=await med.exportCase(a.subject,q);if(c.id===caseId){assert.equal(v.cases[c.id].inspectionResolution.status,'closed_with_agreement');v.inspections[c.id]=await ins.caseView(a.subject,q);assert.equal(v.inspections[c.id].orders.length,1);if(key==='client')v.conversations[orderId]=await ins.conversation(a.subject,{role:a.role,orderId})}}
  if(key==='provider'){assert.equal(v.inspections[caseId].orders[0].quote,null);assert.equal(v.inspections[caseId].orders[0].scope,null);assert.deepEqual(v.inspections[caseId].orders[0].messages,[])}
  data.views[key]=v
 }
 phase='mediator'
 const m=actors.mediator,queue=await med.queue(m.subject);assert.equal(queue.cases.length,2);assert.ok(queue.cases.every(c=>c.requestId===r.id))
 const mv={role:m.role,queue,cases:{},exports:{}}
 for(const c of queue.cases){mv.cases[c.id]=await med.get(m.subject,{claimId:c.id},true);mv.exports[c.id]=await med.exportCase(m.subject,{claimId:c.id},true)}
 data.views.mediator=mv
 phase='inspector'
 const i=actors.inspector,inbox=await ins.inbox(i.subject,{role:i.role});assert.equal(inbox.orders.length,1);assert.equal(inbox.orders[0].id,orderId);assert.equal(inbox.orders[0].status,'report_delivered')
 data.views.inspector={role:i.role,inbox,conversations:{[orderId]:await ins.conversation(i.subject,{role:i.role,orderId})}}
 // All the displayed records are constrained to the known synthetic contract.
 await mkdir('public',{recursive:true});await writeFile('public/dispute-snapshot.json',JSON.stringify(data))
 console.log('MATCHTER_DISPUTE_UI_SNAPSHOT_OK '+JSON.stringify({roles:4,claims:2,readOnly:true,financialWrites:false,providerPrivateDataRedacted:true}))
}catch(e){console.error('MATCHTER_DISPUTE_UI_SNAPSHOT_FAILED '+JSON.stringify({phase,code:e?.code||'CHECK_FAILED'}));process.exitCode=1}finally{if(db)await db.end()}
