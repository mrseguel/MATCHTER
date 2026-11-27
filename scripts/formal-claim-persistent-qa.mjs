import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import pg from 'pg'
import {createFormalClaimService} from '../server/src/formalClaimService.js'
import {DAY} from '../server/src/formalClaimFlow.js'
let db,phase='scope'
try{
 assert.equal(process.env.VERCEL_ENV,'preview')
 const url=new URL(process.env.MATCHTER_DISPUTE_QA_DATABASE_URL)
 assert.equal(decodeURIComponent(url.username),'matchter_dispute_qa_app');assert.equal(url.pathname,'/matchter_payment_qa');assert.ok(url.hostname.endsWith('.neon.tech'));url.searchParams.set('sslmode','verify-full')
 db=new pg.Pool({connectionString:url.href,max:2,connectionTimeoutMillis:10000,statement_timeout:10000})
 const s=(await db.query("SELECT current_database() AS db,current_user AS role,current_setting('neon.branch_id',true) AS branch,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated,has_table_privilege(current_user,'matchter.sandbox_payment_observations','INSERT') AS payment_write FROM pg_roles WHERE rolname=current_user")).rows[0]
 assert.deepEqual(s,{db:'matchter_payment_qa',role:'matchter_dispute_qa_app',branch:'br-lively-frog-b691adhk',elevated:false,payment_write:false})
 const issuer='https://payment-qa.invalid'
 const ids=(await db.query("SELECT a.auth_subject AS subject,p.id,p.role FROM matchter.accounts a JOIN matchter.account_active_profiles ap ON ap.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=ap.role WHERE a.auth_issuer=$1 AND a.auth_subject=ANY($2::text[])",[issuer,['khipu-qa-v1-client','khipu-qa-v1-provider','dispute-qa-outsider']])).rows
 assert.equal(ids.length,3)
 const client=ids.find(x=>x.subject==='khipu-qa-v1-client'),provider=ids.find(x=>x.subject==='khipu-qa-v1-provider'),outsider=ids.find(x=>x.subject==='dispute-qa-outsider')
 const fixtures=(await db.query("SELECT c.id,c.reporter_profile_id AS reporter,c.data FROM matchter.stage_claims c JOIN matchter.swipe_requests r ON r.id=c.request_id WHERE r.id='376c63a4-80bc-406f-8d7e-f539a3423195' AND r.sender_profile_id=$1 AND r.recipient_profile_id=$2 AND NOT EXISTS(SELECT 1 FROM matchter.stage_claim_events e WHERE e.claim_id=c.id)",[client.id,provider.id])).rows
 assert.equal(fixtures.length,1);const c=fixtures[0];assert.ok(c.data.description.startsWith('Reclamo ficticio QA:'))
 const reporter=c.reporter===client.id?client:provider,other=reporter===client?provider:client
 let now=Date.now()
 const verifyIdentity=async h=>{assert.ok(ids.some(x=>x.subject===h));return {issuer,subject:h}}
 const svc=createFormalClaimService({db,verifyIdentity,clock:()=>now})
 const get=a=>svc.get(a.subject,{role:a.role,claimId:c.id})
 const act=(a,action,extra={})=>svc.change(a.subject,{role:a.role,claimId:c.id,submissionId:randomUUID(),action,...extra})
 phase='authorization'
 await assert.rejects(get(outsider),{status:404})
 await assert.rejects(svc.get(client.subject,{role:provider.role,claimId:c.id}),{status:403})
 await assert.rejects(svc.change(reporter.subject,{role:reporter.role,claimId:'28b6d099-ead9-48a2-b3f3-2c595f854191',submissionId:randomUUID(),action:'open'}),{status:409})
 const current=await get(reporter)
 if(current.status==='closed_with_agreement'){assert.equal(current.events.length,8);assert.equal((await get(other)).closed,true);console.log('MATCHTER_FORMAL_QA '+JSON.stringify({event:'existing_persistent_case_verified',events:8,realPayment:false}));}
 else{
 assert.equal(current.status,'not_open')
 phase='open';await assert.rejects(act(other,'open'),{status:409})
 const body={role:reporter.role,claimId:c.id,submissionId:randomUUID(),action:'open'}
 const opened=await svc.change(reporter.subject,body);assert.equal(opened.status,'awaiting_receipt')
 assert.equal((await svc.change(reporter.subject,body)).events.length,1)
 await assert.rejects(svc.change(reporter.subject,{...body,action:'respond',message:'Otro texto'}),{status:409})
 await assert.rejects(act(reporter,'acknowledge'),{status:409})
 const received=await act(other,'acknowledge');assert.ok(received.deadline)
 phase='deadline';now=Date.parse(received.deadline)-DAY*3;assert.deepEqual((await get(reporter)).reminderHoursDue,[48]);now=Date.parse(received.deadline);const overdue=await get(reporter);assert.equal(overdue.administrativeReviewSuggested,true);assert.equal(overdue.status,'response_overdue')
 phase='response';const response=await act(other,'respond',{message:'Respuesta ficticia: revisaremos las terminaciones.'});assert.equal(response.overdue,false)
 const first=await act(reporter,'propose',{message:'Corregir todas las partidas pendientes.'})
 await assert.rejects(act(reporter,'accept',{reference:first.proposal.id}),{status:409});await assert.rejects(act(other,'accept',{reference:randomUUID()}),{status:409})
 await act(other,'decline',{reference:first.proposal.id})
 const second=await act(other,'propose',{message:'Corregir las partidas acreditadas y revisar juntos.'})
 await act(reporter,'respond',{message:'Revisé la nueva propuesta de prueba.'})
 const done=await act(reporter,'accept',{reference:second.proposal.id});assert.equal(done.closed,true);assert.equal(done.events.length,8);assert.equal((await get(other)).status,'closed_with_agreement')
 await assert.rejects(act(other,'respond',{message:'No debe reabrir el caso.'}),{status:409})
 console.log('MATCHTER_FORMAL_QA '+JSON.stringify({event:'persistent_bilateral_agreement_verified',claimId:c.id,events:done.events.length,reminders:[48,72],deadlineDays:5,realPayment:false,automaticSanctions:false}))
 }
}catch(e){console.error('MATCHTER_FORMAL_QA_FAILED '+JSON.stringify({phase,code:e?.code||'CHECK_FAILED'}));process.exitCode=1}finally{if(db)await db.end()}
