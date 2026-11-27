// Runs only against the dedicated synthetic QA contract; every stage/review write is
// inside one outer transaction rolled back even on failure. No provider API calls.
import assert from 'node:assert/strict'
import pg from 'pg'
import {createSandboxContractFeeProjection} from '../server/src/sandboxContractFeeProjection.js'
import {readStageDemo,changeStageDemo} from '../server/src/projectStageDemo.js'
import {readWorkflow} from '../server/src/projectWorkflow.js'
import {readReviewDemo,changeReviewDemo} from '../server/src/projectReviewDemo.js'
let pool,q,phase='configuration',requestId
const log=(event,details={})=>console.log('KHIPU_STAGE_QA '+JSON.stringify({event,realPayment:false,...details}))
try{
 assert.equal(process.env.VERCEL_ENV,'preview')
 const url=new URL(process.env.MATCHTER_PAYMENT_QA_DATABASE_URL)
 assert.equal(url.protocol,'postgresql:');assert.equal(decodeURIComponent(url.username),'matchter_payment_qa_app');assert.equal(url.pathname,'/matchter_payment_qa');assert.ok(url.hostname.endsWith('.neon.tech'))
 url.searchParams.set('sslmode','verify-full')
 pool=new pg.Pool({connectionString:url.href,max:2,connectionTimeoutMillis:10000,statement_timeout:10000})
 q=await pool.connect()
 const scope=(await q.query("SELECT current_database() AS database,current_user AS role,current_setting('neon.branch_id',true) AS branch,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated FROM pg_roles WHERE rolname=current_user")).rows[0]
 assert.deepEqual(scope,{database:'matchter_payment_qa',role:'matchter_payment_qa_app',branch:'br-royal-mud-b648tp0j',elevated:false})
 const r=(await q.query("SELECT r.id,r.sender_profile_id,r.recipient_profile_id FROM matchter.sandbox_payment_attempts a JOIN matchter.swipe_requests r ON r.id=a.request_id WHERE a.id=$1 AND r.details->>'projectTitle'='MATCHTER Khipu external QA webhook 3'",['404caf87-a133-4901-ae61-e6393bda0657'])).rows[0]
 assert.ok(r);requestId=r.id
 const client={id:r.sender_profile_id,role:'Cliente'},provider={id:r.recipient_profile_id,role:'Maestro o contratista'}
 await q.query('BEGIN')
 // Adapt nested service transactions to savepoints without allowing any commit
 // of the outer transaction. Reads and writes use the same connection.
 let nested=false
 const tx={async query(sql,args){if(sql==='BEGIN'){assert.equal(nested,false);nested=true;return q.query('SAVEPOINT service_qa')}if(sql==='COMMIT'){assert.equal(nested,true);nested=false;return q.query('RELEASE SAVEPOINT service_qa')}if(sql==='ROLLBACK'){assert.equal(nested,true);await q.query('ROLLBACK TO SAVEPOINT service_qa');nested=false;return q.query('RELEASE SAVEPOINT service_qa')}return q.query(sql,args)},release(){}}
 const db={query:(...a)=>q.query(...a),connect:async()=>tx}
 const projection=createSandboxContractFeeProjection({db,mode:'isolated_test'}),opts={sandboxFeeProjection:projection}
 phase='baseline'
 const start=await readStageDemo(db,provider,requestId,opts)
 assert.equal(start.paymentMode,'direct');assert.equal(start.financialCustody,false);assert.equal(start.currentStage,1);assert.equal(start.stages.length,1);assert.equal(start.stages[0].startedAt,null)
 const payload={agreementVersion:start.agreementVersion,contractRevision:start.contractRevision,digest:start.digest,stageNo:1,accepted:true}
 const change=(actor,action,extra={},options=opts)=>changeStageDemo(db,actor,requestId,{...payload,action,...extra},options)
 await assert.rejects(readReviewDemo(db,client,requestId,opts),{status:409})
 phase='guards'
 const oneSide={sandboxFeeProjection:async(...a)=>{const c=await projection(...a);return {...c,providerFeeMode:null,providerFeePaidAt:null}}}
 await assert.rejects(change(provider,'start',{},oneSide),{status:409})
 await assert.rejects(change(client,'start'),{status:403})
 await assert.rejects(change(provider,'start',{digest:'0'.repeat(64)}),{status:409})
 await assert.rejects(change(provider,'deliver'),{status:409})
 await assert.rejects(change(client,'accept'),{status:409})
 log('stage_guards_passed',{negativeCases:6})
 phase='execution'
 const started=await change(provider,'start');assert.equal(started.stages[0].status,'in_progress')
 const retry=await change(provider,'start');assert.equal(retry.stages[0].history.length,1)
 const progress=await change(provider,'progress',{progressPercent:50});assert.equal(progress.stages[0].progressPercent,50)
 await assert.rejects(change(provider,'progress',{progressPercent:25}),{status:409})
 const seen=await readStageDemo(db,client,requestId,opts);assert.equal(seen.stages[0].progressPercent,50)
 const delivered=await change(provider,'deliver');assert.equal(delivered.stages[0].progressPercent,100);assert.equal(delivered.stages[0].status,'delivered')
 await assert.rejects(change(provider,'accept'),{status:403})
 const accepted=await change(client,'accept');assert.equal(accepted.complete,true);assert.equal(accepted.financialCustody,false);assert.equal(accepted.stages[0].history.length,4)
 for(const actor of [client,provider]){const w=await readWorkflow(db,actor,requestId,opts);assert.equal(w.complete,true);assert.equal(w.events.filter(x=>x.id.includes(':d:')||x.id.startsWith('workflow:d:')).length,4)}
 log('physical_workflow_verified',{events:4,duplicateStart:false,financialCustody:false})
 phase='review'
 const initial=await readReviewDemo(db,client,requestId,opts);assert.equal(initial.review,null)
 const review={agreementVersion:start.agreementVersion,contractRevision:start.contractRevision,digest:start.digest,score:5,comment:'Calificación ficticia QA; será revertida.',expectedRevision:0}
 await assert.rejects(changeReviewDemo(db,provider,requestId,review,opts),{status:403})
 const saved=await changeReviewDemo(db,client,requestId,review,opts);assert.equal(saved.review.score,5)
 const counterpart=await readReviewDemo(db,provider,requestId,opts);assert.equal(counterpart.review.score,5);assert.equal(counterpart.review.editable,false)
 log('closeout_review_verified')
 await q.query('ROLLBACK')
 phase='rollback_verification'
 const remaining=(await q.query("SELECT (SELECT count(*) FROM matchter.project_direct_stage_events WHERE request_id=$1) AS events,(SELECT count(*) FROM matchter.project_review_demos WHERE request_id=$1) AS reviews",[requestId])).rows[0]
 assert.equal(Number(remaining.events),0);assert.equal(Number(remaining.reviews),0)
 log('rollback_verified',{persistentStageEvents:0,persistentReviews:0})
 const {mkdir,writeFile}=await import('node:fs/promises');await mkdir('dist',{recursive:true});await writeFile('dist/index.html','<!doctype html><p>QA de seguimiento y cierre completada. Sin datos de obra persistidos.</p>')
}catch(e){console.error('KHIPU_STAGE_QA_FAILED '+JSON.stringify({phase,code:typeof e?.code==='string'&&/^[0-9A-Z_]{1,30}$/.test(e.code)?e.code:'CHECK_FAILED',status:e?.status||null}));process.exitCode=1}finally{if(q){await q.query('ROLLBACK').catch(()=>{});q.release()}if(pool)await pool.end()}
