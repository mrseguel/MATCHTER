// Read the verified synthetic contract; simulate dispute events in memory.
// Never broaden the webhook database role, insert case records or call payment APIs.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import pg from 'pg'
import {createSandboxContractFeeProjection} from '../server/src/sandboxContractFeeProjection.js'
import {contractContext} from '../server/src/projectContractDemo.js'
import {readStageDemo} from '../server/src/projectStageDemo.js'
import {prepareStageClaim} from '../server/src/stageClaimIntake.js'
import {checkMediationAction,mediationState} from '../server/src/mediationFlow.js'
import {nextInspectionEvent,inspectionState} from '../server/src/inspectionLifecycle.js'
import {checkInspectionResolutionAction,inspectionResolutionState} from '../server/src/inspectionResolution.js'
let db,phase='configuration'
const log=(event,extra={})=>console.log('KHIPU_DISPUTE_QA '+JSON.stringify({event,realPayment:false,...extra}))
try{
 assert.equal(process.env.VERCEL_ENV,'preview')
 const url=new URL(process.env.MATCHTER_PAYMENT_QA_DATABASE_URL)
 assert.equal(url.protocol,'postgresql:');assert.equal(decodeURIComponent(url.username),'matchter_payment_qa_app');assert.equal(url.pathname,'/matchter_payment_qa');assert.ok(url.hostname.endsWith('.neon.tech'));url.searchParams.set('sslmode','verify-full')
 db=new pg.Pool({connectionString:url.href,max:2,connectionTimeoutMillis:10000,statement_timeout:10000})
 const scope=(await db.query("SELECT current_database() AS database,current_user AS role,current_setting('neon.branch_id',true) AS branch,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated FROM pg_roles WHERE rolname=current_user")).rows[0]
 assert.deepEqual(scope,{database:'matchter_payment_qa',role:'matchter_payment_qa_app',branch:'br-royal-mud-b648tp0j',elevated:false})
 const r=(await db.query("SELECT r.id,r.sender_profile_id,r.recipient_profile_id FROM matchter.sandbox_payment_attempts a JOIN matchter.swipe_requests r ON r.id=a.request_id WHERE a.id=$1 AND r.details->>'projectTitle'='MATCHTER Khipu external QA webhook 3'",['404caf87-a133-4901-ae61-e6393bda0657'])).rows[0]
 const projection=createSandboxContractFeeProjection({db,mode:'isolated_test'}),opts={sandboxFeeProjection:projection}
 const before=(await db.query("SELECT count(*)::int AS n FROM matchter.stage_claims WHERE request_id=$1",[r.id])).rows[0].n
 phase='intake'
 for(const actor of [{id:r.sender_profile_id,role:'Cliente'},{id:r.recipient_profile_id,role:'Maestro o contratista'}]){
  const {side,agreement,current:stored}=await contractContext(db,actor,r.id,false),contract=await projection(actor,r.id,stored)
  const tracking=await readStageDemo(db,actor,r.id,opts)
  assert.equal(contract.sandboxFeeVerification.client,'verified_test');assert.equal(contract.sandboxFeeVerification.provider,'verified_test')
  const input={requestId:r.id,submissionId:randomUUID(),agreementVersion:agreement.version,contractRevision:contract.revision,digest:contract.digest,stageNo:1,reason:'quality_scope',description:'Antecedente ficticio de una diferencia de alcance en la etapa contractual.',requestedResolution:'Revisar alcance y corregir la partida',contractReference:'Cláusula de alcance'}
  const claim=prepareStageClaim({input,agreement,contract,tracking,side})
  assert.equal(claim.mode,'direct');assert.equal(claim.status,'received');assert.equal(claim.side,side);assert.equal(claim.stageSnapshot.amount,100000)
  assert.throws(()=>prepareStageClaim({input:{...input,digest:'0'.repeat(64)},agreement,contract,tracking,side}),{status:409})
  assert.throws(()=>prepareStageClaim({input,agreement,contract,tracking,side:'other'}),{status:403})
 }
 log('claim_intake_verified',{roles:2,actualContract:true,persisted:false})
 phase='mediation'
 const events=[]
 const add=(side,action,extra={})=>{const e={id:randomUUID(),...checkMediationAction({events,side,action,mode:'direct',...extra})};events.push(e);return e}
 add('mediator','review');const invite=add('mediator','invite')
 add('client','join',{reference:invite.id});assert.equal(mediationState(events).status,'invited')
 assert.throws(()=>add('mediator','propose',{text:'Reparación sugerida'}),{status:409})
 add('provider','join',{reference:invite.id});const proposal=add('mediator','propose',{text:'Revisar y corregir la partida acordada'})
 add('client','accept',{reference:proposal.id});assert.equal(mediationState(events).status,'mediation')
 add('provider','decision_decline',{reference:proposal.id});assert.equal(mediationState(events).status,'closed_without_agreement')
 add('client','inspection',{text:'Solicito una evaluación independiente de la partida'})
 assert.throws(()=>add('client','inspection',{text:'Solicitud repetida'}),{status:409})
 log('voluntary_mediation_verified',{closedWithoutAgreement:true,inspectionRequested:true})
 phase='inspection'
 const requester={profileId:randomUUID(),accountId:randomUUID()},inspector={profileId:randomUUID(),accountId:randomUUID()},outsider={profileId:randomUUID(),accountId:randomUUID()}
 const order={caseId:randomUUID(),requesterProfileId:requester.profileId,requesterAccountId:requester.accountId,inspectorProfileId:inspector.profileId,partyAccountIds:[requester.accountId,randomUUID()],inspector:{...inspector,verified:true,eligible:true}}
 const ie=[],now=Date.now(),at=new Date(now+86400000).toISOString()
 const inspect=(actor,action,input,time=now)=>{const e={id:randomUUID(),...nextInspectionEvent({order,events:ie,actor,action,input,now:time})};ie.push(e);return e}
 const quote={scope:'Revisar alcance y terminaciones de la partida',feeCLP:50000,validUntil:new Date(now+172800000).toISOString()}
 assert.throws(()=>inspect(outsider,'quote',quote),{status:403})
 const q=inspect(inspector,'quote',quote)
 assert.throws(()=>inspect(requester,'accept',{quoteId:q.id,feeCLP:1,accepted:true}),{status:409})
 inspect(requester,'accept',{quoteId:q.id,feeCLP:50000,accepted:true})
 const visit=inspect(inspector,'visit',{at});inspect(requester,'confirm_visit',{visitId:visit.id,accepted:true})
 const report=inspect(inspector,'report',{visitedAt:at,findings:'Se observan partidas pendientes de terminación.',limitations:'Inspección visual ficticia',items:[{kind:'completion',description:'Terminación pendiente',amountCLP:15000}]},now+86400000)
 assert.equal(inspectionState(ie).status,'report_delivered');assert.equal(report.report.authorizesDeduction,false)
 log('independent_inspection_verified',{quoteAccepted:true,visitConfirmed:true,reportDelivered:true,noMoneyMoved:true})
 phase='resolution'
 const final=[]
 const resolve=(side,action,reference,text)=>{const e={id:randomUUID(),...checkInspectionResolutionAction({events:final,reportId:report.id,side,action,reference,text,mode:'direct',mediationStatus:mediationState(events).status})};final.push(e);return e}
 resolve('client','inspection_observation',report.id,'Revisar la terminación')
 resolve('provider','inspection_observation',report.id,'Confirmar alcance de la reparación')
 const solution=resolve('mediator','inspection_propose',report.id,'Realizar corrección de común acuerdo')
 resolve('client','inspection_accept',solution.id);assert.equal(inspectionResolutionState(final,report.id).status,'proposed')
 resolve('provider','inspection_accept',solution.id);assert.equal(inspectionResolutionState(final,report.id).status,'closed_with_agreement')
 assert.equal(inspectionResolutionState(final,report.id).moneyInstruction,undefined)
 assert.equal((await db.query("SELECT count(*)::int AS n FROM matchter.stage_claims WHERE request_id=$1",[r.id])).rows[0].n,before)
 log('resolution_verified',{bilateralAgreement:true,persistentClaimsUnchanged:true})
 const {mkdir,writeFile}=await import('node:fs/promises');await mkdir('dist',{recursive:true});await writeFile('dist/index.html','<!doctype html><p>Validación QA de controversias: reglas simuladas, no se crearon expedientes.</p>')
}catch(e){console.error('KHIPU_DISPUTE_QA_FAILED '+JSON.stringify({phase,code:typeof e?.code==='string'&&/^[0-9A-Z_]{1,30}$/.test(e.code)?e.code:'CHECK_FAILED',status:e?.status||null}));process.exitCode=1}finally{if(db)await db.end()}
