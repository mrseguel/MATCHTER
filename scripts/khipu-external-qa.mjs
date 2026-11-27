// One private, explicitly authorized Khipu development-account QA order.
// No public API route, user input, production, real banking, webhook or automatic retry.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import pg from 'pg'
import {generateKeyPair,SignJWT} from 'jose'
import {createIdentityVerifier,createAccountService} from '../server/src/identityAccounts.js'
import {createProfilesService} from '../server/src/accountProfiles.js'
import {readContractDemo,changeContractDemo} from '../server/src/projectContractDemo.js'
import {createSandboxPaymentAttempts} from '../server/src/sandboxPaymentAttempts.js'
import {createSandboxReconciliation} from '../server/src/sandboxPaymentReconciliation.js'
import {createSandboxProviderTransport} from '../server/src/sandboxProviderTransport.js'
import {createSandboxPaymentWorker} from '../server/src/sandboxPaymentWorker.js'
import {createKhipuDemoBankGuard} from '../server/src/khipuDemoBankGuard.js'
import {probeKhipu} from './khipu-sandbox-probe.mjs'
const mode='isolated_test',providers=['khipu'],merchantId='533557'
const issuer='https://payment-qa.invalid',clientRole='Cliente',providerRole='Maestro o contratista'
const label='MATCHTER Khipu external QA 1',dedupe=createHash('sha256').update(label).digest('hex')
const submissionId='c19e4e13-0c05-47fd-9206-953734fa8a01'
const data={title:'Obra ficticia Khipu QA',scope:'Contrato exclusivamente de prueba sin ejecución ni dinero real.',start:'2026-12-01',end:'2026-12-31',totalAmount:100000,stages:[['Etapa QA','2026-12-31',100000,100]]}
const log=(event,extra={})=>console.log('KHIPU_EXTERNAL_QA '+JSON.stringify({event,realPayment:false,...extra}))
const stage=process.argv[2]
let db,lock,phase='configuration'
try{
 assert.ok(['--prepare','--create','--reconcile'].includes(stage))
 assert.equal(process.env.VERCEL_ENV,'preview')
 const origin='https://'+process.env.VERCEL_URL
 assert.match(origin,/^https:\/\/matchter-beta-[a-z0-9-]+\.vercel\.app$/)
 const url=new URL(process.env.MATCHTER_PAYMENT_QA_DATABASE_URL)
 assert.equal(decodeURIComponent(url.username),'matchter_payment_qa_app')
 assert.equal(url.pathname,'/matchter_payment_qa')
 assert.match(url.hostname,/^[a-z0-9.-]+\.neon\.tech$/)
 assert.equal(url.protocol,'postgresql:')
 url.searchParams.set('sslmode','verify-full')
 db=new pg.Pool({connectionString:url.href,max:4,connectionTimeoutMillis:10000,statement_timeout:10000})
 phase='database'
 const scope=(await db.query("SELECT current_database() AS database,current_user AS role,rolcreatedb OR rolcreaterole OR rolsuper OR rolbypassrls AS elevated FROM pg_roles WHERE rolname=current_user")).rows[0]
 assert.deepEqual(scope,{database:'matchter_payment_qa',role:'matchter_payment_qa_app',elevated:false})
 lock=await db.connect()
 const held=(await lock.query("SELECT pg_try_advisory_lock(hashtextextended('khipu-external-qa-v1',0)) AS acquired")).rows[0]
 assert.equal(held.acquired,true)
 log('isolated_database_verified')
 phase='bank_preflight'
 const key=process.env.KHIPU_API_KEY
 const preflight=await probeKhipu({key})
 assert.equal(preflight.status,'demo_banks_only')
 log('demo_bank_verified',{bankCount:preflight.bankCount})
 phase='fixture'
 const {privateKey,publicKey}=await generateKeyPair('EdDSA')
 const verifyIdentity=createIdentityVerifier({issuer,audience:issuer,jwksUrl:issuer+'/.well-known/jwks.json',algorithms:['EdDSA']},publicKey)
 const accounts=createAccountService({db,verifyIdentity}),profiles=createProfilesService({db,verifyIdentity})
 const actors={}
 for(const [who,role] of [['client',clientRole],['provider',providerRole]]){
  const token=await new SignJWT({emailVerified:true}).setProtectedHeader({alg:'EdDSA'}).setIssuer(issuer).setAudience(issuer).setSubject('khipu-qa-v1-'+who).setIssuedAt().setExpirationTime('10m').sign(privateKey)
  const header='Bearer '+token
  await accounts.onboard(header,{role})
  const p=await profiles.list(header)
  assert.equal(p.activeRole,role)
  actors[who]={header,role,id:p.profiles.find(x=>x.role===role).id}
 }
 const c=actors.client,p=actors.provider
 assert.notEqual(c.id,p.id)
 const details={projectTitle:label}
 await db.query("INSERT INTO matchter.swipe_requests(sender_profile_id,recipient_profile_id,dedupe_key,details) VALUES($1,$2,$3,$4) ON CONFLICT(sender_profile_id,recipient_profile_id,dedupe_key) DO NOTHING",[c.id,p.id,dedupe,JSON.stringify(details)])
 const req=(await db.query("SELECT id,status,details FROM matchter.swipe_requests WHERE sender_profile_id=$1 AND recipient_profile_id=$2 AND dedupe_key=$3",[c.id,p.id,dedupe])).rows[0]
 assert.deepEqual(req.details,details)
 assert.ok(['pending','accepted'].includes(req.status))
 if(req.status==='pending')await db.query("UPDATE matchter.swipe_requests SET status='accepted',responded_at=now() WHERE id=$1 AND status='pending'",[req.id])
 await db.query("INSERT INTO matchter.project_agreement_versions(request_id,version,proposed_by,data,client_confirmed_at,provider_confirmed_at) VALUES($1,1,$2,$3,now(),now()) ON CONFLICT(request_id,version) DO NOTHING",[req.id,c.id,JSON.stringify(data)])
 const agreement=(await db.query('SELECT version,data,client_confirmed_at,provider_confirmed_at FROM matchter.project_agreement_versions WHERE request_id=$1 ORDER BY version DESC LIMIT 1',[req.id])).rows[0]
 assert.equal(agreement.version,1);assert.deepEqual(agreement.data,data);assert.ok(agreement.client_confirmed_at&&agreement.provider_confirmed_at)
 const options={paymentModeForNewContract:async()=> 'direct'}
 let view=await readContractDemo(db,c,req.id,options)
 if(!view.contract)view=await changeContractDemo(db,c,req.id,{action:'choose',agreementVersion:1,expectedRevision:0,mode:'simple'},options)
 const contract=view.contract
 assert.equal(contract.revision,1);assert.equal(contract.mode,'simple');assert.equal(contract.terms.paymentMode,'direct');assert.equal(contract.terms.serviceFee.version,2);assert.equal(contract.terms.serviceFee.amount,2990);assert.equal(contract.serviceFeePaidAt,null)
 const signature={action:'confirm',agreementVersion:1,expectedRevision:1,digest:contract.digest,accepted:true,identityDemo:true,identityChecks:{front:true,back:true,selfie:true}}
 if(!contract.confirmed.client)await changeContractDemo(db,c,req.id,signature,options)
 if(!contract.confirmed.provider)await changeContractDemo(db,p,req.id,signature,options)
 const signed=(await readContractDemo(db,c,req.id,options)).contract
 assert.ok(signed.confirmed.client&&signed.confirmed.provider);assert.equal(signed.digest,contract.digest)
 phase='reservation'
 const attempts=createSandboxPaymentAttempts({db,verifyIdentity,mode,providers})
 const args={role:clientRole,requestId:req.id,agreementVersion:1,contractRevision:1,digest:contract.digest,provider:'khipu',submissionId}
 const reserved=await attempts.reserve(c.header,args)
 assert.equal(reserved.amountCLP,2990)
 assert.equal((await attempts.reserve(c.header,args)).id,reserved.id)
 await assert.rejects(attempts.read(p.header,{role:providerRole,attemptId:reserved.id}),{status:404})
 log('persistent_reservation_verified',{amountCLP:2990,state:reserved.state,attemptId:reserved.id})
 const merchants={khipu:merchantId}
 const transport=createSandboxProviderTransport({mode,providers,credentials:{khipu:{environment:'sandbox',merchantId,secret:key}},origin,fetchImpl:createKhipuDemoBankGuard({fetchImpl:globalThis.fetch,merchantId,developerAccountConfirmed:true})})
 const reconciliation=createSandboxReconciliation({db,mode,providers,merchants})
 const worker=createSandboxPaymentWorker({mode,providers,db,attempts,reconciliation,transport,merchants})
 phase='output'
 await mkdir('dist/payment-test-return',{recursive:true})
 const head='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>MATCHTER QA</title>'
 const ret=head+'<h1>Prueba Khipu</h1><p>El retorno no confirma un pago. Debe verificarse con la API de Khipu. No utilices cuentas ni dinero reales.</p>'
 await writeFile('dist/payment-test-return/index.html',ret)
 if(stage==='--prepare'){
  assert.equal(reserved.state,'reserved')
  await writeFile('dist/index.html',head+'<p>Base, contrato ficticio y reserva verificados. No se creó ningún cobro.</p>')
  log('ready_for_checkout')
 }else if(stage==='--create'){
  phase='checkout'
  // Only a reserved attempt can be dispatched. Uncertain or previously created
  // attempts are never re-sent, even on redeployment.
  assert.equal(reserved.state,'reserved')
  const checkout=await worker.dispatch(reserved.id,c.id)
  const u=new URL(checkout.checkoutUrl)
  assert.equal(u.protocol,'https:');assert.ok(['khipu.com','app.khipu.com'].includes(u.hostname))
  const state=await worker.reconcile(reserved.id)
  assert.equal(state.status,'pending')
  const safe=u.href.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  await writeFile('dist/index.html',head+'<h1>MATCHTER – pago de prueba</h1><p>$2.990 CLP ficticios. Solo DemoBank. No ingreses datos bancarios reales.</p><p><a rel="noreferrer" href="'+safe+'">Abrir pago de prueba en Khipu</a></p>')
  log('checkout_created_and_verified',{amountCLP:2990,state:state.status,attemptId:reserved.id})
 }else{
  phase='reconcile'
  assert.equal(reserved.state,'checkout_created')
  const state=await worker.reconcile(reserved.id)
  assert.ok(['pending','verified_test','review','declined'].includes(state.status))
  await writeFile('dist/index.html',head+'<p>Estado consultado directamente en Khipu: '+state.status+'. Sin fondos reales.</p>')
  log('reconciliation_verified',{state:state.status,attemptId:reserved.id})
 }
}catch(e){
 // Never print raw SQL, provider errors, full URLs, tokens, or environment values.
 console.error('KHIPU_EXTERNAL_QA_FAILED '+JSON.stringify({phase,code:typeof e?.code==='string'&&/^[0-9A-Z_]{1,30}$/.test(e.code)?e.code:'CHECK_FAILED'}))
 process.exitCode=1
}finally{
 if(lock){try{await lock.query("SELECT pg_advisory_unlock(hashtextextended('khipu-external-qa-v1',0))")}catch{}lock.release()}
 if(db)await db.end()
}
