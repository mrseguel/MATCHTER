// Persistent dispute QA only. All records are synthetic; no public auth bypass.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import pg from 'pg'
import {createSandboxContractFeeProjection} from '../server/src/sandboxContractFeeProjection.js'
import {readStageDemo} from '../server/src/projectStageDemo.js'
import {submitStageClaim,listStageClaims} from '../server/src/stageClaimsService.js'
import {createMediationService} from '../server/src/mediationService.js'
import {createInspectionService} from '../server/src/inspectionService.js'
let pool,q,committed=false,phase='configuration'
const log=(event,extra={})=>console.log('MATCHTER_DISPUTE_PERSISTENT_QA '+JSON.stringify({event,...extra,realPayment:false}))
const issuer='https://payment-qa.invalid'
try{
 assert.equal(process.env.VERCEL_ENV,'preview')
 const url=new URL(process.env.MATCHTER_DISPUTE_QA_DATABASE_URL)
 assert.equal(url.protocol,'postgresql:');assert.equal(decodeURIComponent(url.username),'matchter_dispute_qa_app');assert.equal(url.pathname,'/matchter_payment_qa');assert.ok(url.hostname.endsWith('.neon.tech'));url.searchParams.set('sslmode','verify-full')
 pool=new pg.Pool({connectionString:url.href,max:2,connectionTimeoutMillis:10000,statement_timeout:10000})
 q=await pool.connect()
 const s=(await q.query("SELECT current_database() AS db,current_user AS role,current_setting('neon.branch_id',true) AS branch,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated,has_table_privilege(current_user,'matchter.sandbox_payment_observations','INSERT') AS payment_write FROM pg_roles WHERE rolname=current_user")).rows[0]
 assert.deepEqual(s,{db:'matchter_payment_qa',role:'matchter_dispute_qa_app',branch:'br-lively-frog-b691adhk',elevated:false,payment_write:false})
 const ids=(await q.query("SELECT a.auth_subject AS subject,p.id AS id,p.role FROM matchter.accounts a JOIN matchter.account_profiles p ON p.account_id=a.id WHERE a.auth_issuer=$1 AND a.auth_subject=ANY($2::text[])",[issuer,['khipu-qa-v1-client','khipu-qa-v1-provider','dispute-qa-mediator','dispute-qa-inspector','dispute-qa-outsider']])).rows
 assert.equal(ids.length,5)
 const actor=name=>{const row=ids.find(x=>x.subject===name);assert.ok(row);return row}
 const c=actor('khipu-qa-v1-client'),p=actor('khipu-qa-v1-provider'),m=actor('dispute-qa-mediator'),i=actor('dispute-qa-inspector'),o=actor('dispute-qa-outsider')
 const r=(await q.query("SELECT r.id,r.sender_profile_id,r.recipient_profile_id FROM matchter.sandbox_payment_attempts a JOIN matchter.swipe_requests r ON r.id=a.request_id WHERE a.id=$1 AND r.details->>'projectTitle'='MATCHTER Khipu external QA webhook 3'",['404caf87-a133-4901-ae61-e6393bda0657'])).rows[0]
 assert.equal(r.sender_profile_id,c.id);assert.equal(r.recipient_profile_id,p.id)
 await q.query('BEGIN')
 await q.query("SELECT pg_advisory_xact_lock(hashtextextended('dispute-qa-persist-v1',0))")
 assert.equal((await q.query('SELECT count(*)::int AS n FROM matchter.stage_claims WHERE request_id=$1',[r.id])).rows[0].n,0)
 let nested=false
 const tx={async query(sql,args){if(sql==='BEGIN'){assert.equal(nested,false);nested=true;return q.query('SAVEPOINT svc')}if(sql==='COMMIT'){assert.equal(nested,true);nested=false;return q.query('RELEASE SAVEPOINT svc')}if(sql==='ROLLBACK'){assert.equal(nested,true);await q.query('ROLLBACK TO SAVEPOINT svc');nested=false;return q.query('RELEASE SAVEPOINT svc')}return q.query(sql,args)},release(){}}
 const db={query:(...a)=>q.query(...a),connect:async()=>tx}
 const opts={sandboxFeeProjection:createSandboxContractFeeProjection({db,mode:'isolated_dispute_test'})}
 // Only this non-networked script supplies these synthetic verified identities.
 const verifyIdentity=async header=>{const a=ids.find(x=>x.subject===header);if(!a)throw Object.assign(Error('Unauthorized'),{status:403});return {issuer,subject:a.subject}}
 let now=Date.now()
 const med=createMediationService({db,verifyIdentity,inspectionsEnabled:true}),ins=createInspectionService({db,verifyIdentity,clock:()=>now})
 phase='claim'
 const stage=await readStageDemo(db,c,r.id,opts);assert.equal(stage.paymentMode,'direct');assert.equal(stage.currentStage,1)
 const input=a=>({role:a.role,requestId:r.id,submissionId:randomUUID(),agreementVersion:stage.agreementVersion,contractRevision:stage.contractRevision,digest:stage.digest,stageNo:1,reason:'quality_scope',description:'Reclamo ficticio QA: diferencia de alcance en la etapa contractual.',requestedResolution:'Revisar alcance de la partida',contractReference:'Contrato de prueba'})
 const b=input(c)
 const {claim}=await submitStageClaim(db,c,r.id,b,opts)
 assert.equal((await submitStageClaim(db,c,r.id,b,opts)).claim.id,claim.id)
 const other=(await submitStageClaim(db,p,r.id,input(p),opts)).claim
 assert.notEqual(other.id,claim.id)
 assert.equal((await listStageClaims(db,c,r.id)).claims.length,2)
 assert.equal((await listStageClaims(db,p,r.id)).claims.length,2)
 await assert.rejects(listStageClaims(db,o,r.id),{status:404})
 log('persistent_intake_verified',{claims:2,duplicate:false})
 phase='mediation'
 const act=(a,action,extra={},mediator=false)=>med.change(a.subject,{role:a.role,claimId:claim.id,submissionId:randomUUID(),action,...extra},mediator)
 await assert.rejects(med.get(o.subject,{role:o.role,claimId:claim.id}),{status:404})
 await assert.rejects(med.access(c.subject),{status:403})
 await med.access(m.subject)
 await act(m,'review',{},true)
 const invitation=await act(m,'invite',{},true)
 await act(c,'join',{reference:invitation.invitation})
 await act(p,'join',{reference:invitation.invitation})
 const proposed=await act(m,'propose',{text:'Revisar terminaciones de común acuerdo.'},true)
 await act(c,'accept',{reference:proposed.proposal.id})
 const closed=await act(p,'decision_decline',{reference:proposed.proposal.id})
 assert.equal(closed.status,'closed_without_agreement')
 await act(c,'inspection',{text:'Solicito una evaluación técnica independiente.'})
 log('persistent_mediation_verified',{noAgreement:true})
 phase='inspection'
 const list=await ins.caseView(c.subject,{role:c.role,claimId:claim.id})
 assert.equal(list.canSelect,true);assert.ok(list.inspectors.some(x=>x.profileId===i.id))
 const selected=await ins.select(c.subject,{role:c.role,claimId:claim.id,inspectorProfileId:i.id,scope:'Inspección ficticia de alcance y terminaciones.'})
 const orderId=selected.order.id
 const change=(a,action,input)=>ins.change(a.subject,{role:a.role,orderId,submissionId:randomUUID(),action,input})
 await assert.rejects(ins.conversation(p.subject,{role:p.role,orderId}),{status:404})
 const quote=await change(i,'quote',{scope:'Evaluación técnica ficticia de terminaciones.',feeCLP:50000,validUntil:new Date(now+172800000).toISOString()})
 await assert.rejects(change(c,'accept',{quoteId:quote.order.quote.id,feeCLP:1,accepted:true}),{status:409})
 await change(c,'accept',{quoteId:quote.order.quote.id,feeCLP:50000,accepted:true})
 const visitAt=new Date(now+86400000).toISOString()
 const visit=await change(i,'visit',{at:visitAt})
 await change(c,'confirm_visit',{visitId:visit.order.visit.id,accepted:true})
 // Advance only the injected fictional clock, not real time or the DB clock.
 now+=86400000
 const report=await change(i,'report',{visitedAt:visitAt,findings:'Informe ficticio: se observan partidas pendientes de terminación.',limitations:'Inspección visual simulada; no hubo visita física.',items:[{kind:'completion',description:'Terminación pendiente de prueba',amountCLP:15000}]})
 assert.equal(report.order.status,'report_delivered');assert.equal(report.order.report.authorizesDeduction,false)
 const rec=await med.get(p.subject,{role:p.role,claimId:claim.id});const reportId=rec.inspection.events.find(e=>e.action==='report').id
 assert.ok(reportId);assert.equal(rec.inspection.noMoneyMoved,true)
 log('persistent_inspection_verified',{orderId,fictionalVisit:true,noMoneyMoved:true})
 phase='resolution'
 await act(c,'inspection_observation',{reference:reportId,text:'Solicito revisar el detalle técnico.'})
 await act(p,'inspection_observation',{reference:reportId,text:'Conforme con revisar la partida.'})
 const solution=await act(m,'inspection_propose',{reference:reportId,text:'Corregir la partida de común acuerdo.'},true)
 await act(c,'inspection_accept',{reference:solution.inspectionResolution.proposal.id})
 const resolved=await act(p,'inspection_accept',{reference:solution.inspectionResolution.proposal.id})
 assert.equal(resolved.inspectionResolution.status,'closed_with_agreement')
 const exported=await med.exportCase(c.subject,{role:c.role,claimId:claim.id});assert.equal(exported.format,'matchter-mediation-record-v1');assert.equal(exported.case.inspectionResolution.status,'closed_with_agreement')
 await q.query('COMMIT');committed=true;q.release();q=null
 phase='independent_read'
 const persisted=createMediationService({db:pool,verifyIdentity,inspectionsEnabled:true})
 for(const a of [c,p]){const record=await persisted.get(a.subject,{role:a.role,claimId:claim.id});assert.equal(record.inspectionResolution.status,'closed_with_agreement')}
 const counts=(await pool.query("SELECT (SELECT count(*)::int FROM matchter.stage_claims WHERE request_id=$1) AS claims,(SELECT count(*)::int FROM matchter.stage_claim_events WHERE claim_id=$2) AS events,(SELECT count(*)::int FROM matchter.inspection_order_events WHERE order_id=$3) AS inspection_events",[r.id,claim.id,orderId])).rows[0]
 log('persistent_resolution_verified',{claimId:claim.id,...counts})
 const {mkdir,writeFile}=await import('node:fs/promises');await mkdir('dist',{recursive:true});await writeFile('dist/index.html','<!doctype html><html lang="es"><meta charset="utf-8"><title>MATCHTER · QA de controversias</title><h1>Expedientes QA persistidos</h1><p>Dos reclamos ficticios. Mediación, inspección y resolución bilateral verificadas. Sin movimientos de dinero.</p></html>')
}catch(e){console.error('MATCHTER_DISPUTE_PERSISTENT_FAILED '+JSON.stringify({phase,committed,code:typeof e?.code==='string'&&/^[0-9A-Z_]{1,30}$/.test(e.code)?e.code:'CHECK_FAILED',status:e?.status||null}));process.exitCode=1}finally{if(q){await q.query('ROLLBACK').catch(()=>{});q.release()}if(pool)await pool.end()}
