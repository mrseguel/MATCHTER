// End-to-end HTTP QA, exclusively on an empty local PostgreSQL service in CI.
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {request} from 'node:http'
// Native fetch rewrites Host; use the actual HTTP client to exercise the host/origin gate.
function fetch(url,options={}){return new Promise((resolve,reject)=>{
 const req=request(url,{method:options.method||'GET',headers:options.headers||{}},res=>{
  let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(body)}));res.on('error',reject)
 });req.on('error',reject);req.setTimeout(15000,()=>req.destroy(Error('QA HTTP timeout')));req.end(options.body)
})}
import {readFile,readdir} from 'node:fs/promises'
import express from 'express'
import pg from 'pg'
import {generateKeyPair,SignJWT} from 'jose'
import {createSandboxReconciliation} from '../server/src/sandboxPaymentReconciliation.js'
import {createSandboxPaymentAttempts} from '../server/src/sandboxPaymentAttempts.js'
import {createAuthRouter} from '../server/src/authPreviewRoutes.js'
import {createIdentityVerifier,createAccountService} from '../server/src/identityAccounts.js'
import {createProfilesService} from '../server/src/accountProfiles.js'
import {createMessagesService} from '../server/src/messagesService.js'
import {createPaymentAvailabilityService} from '../server/src/paymentAvailabilityService.js'
import {createMediationService} from '../server/src/mediationService.js'
import {createCaseNotices} from '../server/src/caseNotices.js'
import {createInspectorAdministration} from '../server/src/caseAdministration.js'
import {createInspectionService} from '../server/src/inspectionService.js'
const {Pool}=pg
if(process.env.MATCHTER_EPHEMERAL_QA!=='true'||process.env.CI!=='true')throw Error('Only isolated CI database allowed')
const admin=new Pool({host:'127.0.0.1',port:5432,database:'matchter_qa',user:'postgres',password:'qa_local_only'})
let db,server
const issuer='https://qa.invalid',roles=['Cliente','Maestro o contratista','Profesional','Profesional','Profesional']
const names=['client','provider','inspector','alternative','mediator']
const origin='https://qa.invalid'
let checks=0
try{
 const existing=await admin.query("SELECT to_regnamespace('matchter') AS schema")
 assert.equal(existing.rows[0].schema,null,'Must be a fresh database')
 await admin.query("CREATE ROLE matchter_auth_app LOGIN PASSWORD 'qa_app_local_only'; CREATE SCHEMA matchter; GRANT USAGE ON SCHEMA matchter TO matchter_auth_app; CREATE TABLE matchter.accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),auth_issuer text NOT NULL,auth_subject text NOT NULL,role text NOT NULL CHECK(role IN ('Cliente','Maestro o contratista','Profesional','Empresa')),UNIQUE(auth_issuer,auth_subject)); GRANT SELECT(id,auth_issuer,auth_subject,role),INSERT(auth_issuer,auth_subject,role) ON matchter.accounts TO matchter_auth_app")
 for(const file of (await readdir('server/db')).filter(n=>/^0(0[3-9]|1[0-8])_.*\.sql$/.test(n)).sort())await admin.query(await readFile('server/db/'+file,'utf8'))
 await admin.query(await readFile('docs/migrations/019-025_fresh_qa.sql','utf8'))
 await admin.query(await readFile('docs/migrations/026_case_completion.draft.sql','utf8'))
 await admin.query(await readFile('docs/migrations/027_sandbox_payment_attempts.draft.sql','utf8'))
 await admin.query(await readFile('docs/migrations/028_sandbox_payment_reconciliation.draft.sql','utf8'))
 db=new Pool({host:'127.0.0.1',port:5432,database:'matchter_qa',user:'matchter_auth_app',password:'qa_app_local_only'})
 const {privateKey,publicKey}=await generateKeyPair('EdDSA')
 const verifyIdentity=createIdentityVerifier({issuer,audience:issuer,jwksUrl:issuer+'/.well-known/jwks.json',algorithms:['EdDSA']},publicKey)
 const paymentAvailability=createPaymentAvailabilityService({db,verifyIdentity})
 const service={caseNotices:createCaseNotices({db,verifyIdentity}),inspectorAdmin:createInspectorAdministration({db,verifyIdentity}),...createAccountService({db,verifyIdentity}),profiles:createProfilesService({db,verifyIdentity}),paymentAvailability,messages:createMessagesService({db,verifyIdentity,paymentModeForNewContract:paymentAvailability.modeForNewContract,claimsEnabled:true,walletEnabled:true}),mediation:createMediationService({db,verifyIdentity,inspectionsEnabled:true,evidenceEnabled:true}),inspections:createInspectionService({db,verifyIdentity,attachmentsEnabled:true})}
 const app=express();app.use(express.json({limit:'1mb'}));app.use('/api/auth-preview',createAuthRouter({MATCHTER_AUTH_TEST_ORIGIN:origin,MATCHTER_NEON_AUTH_URL:'https://qa.neon.tech/auth',MATCHTER_STAGE_CLAIMS_ENABLED:'true',MATCHTER_MEDIATION_ENABLED:'true',MATCHTER_INSPECTIONS_ENABLED:'true',MATCHTER_INSPECTION_ATTACHMENTS_ENABLED:'true',MATCHTER_CASE_COMPLETION_ENABLED:'true',MATCHTER_WALLET_HISTORY_ENABLED:'true'},{service}))
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
 const base='http://127.0.0.1:'+server.address().port+'/api/auth-preview'
 const actors={}
 for(let i=0;i<names.length;i++)actors[names[i]]={role:roles[i],token:await new SignJWT({emailVerified:true}).setProtectedHeader({alg:'EdDSA'}).setIssuer(issuer).setAudience(issuer).setSubject(names[i]).setIssuedAt().setExpirationTime('10m').sign(privateKey)}
 async function call(who,path,body,expected=200,query={}){
  const a=actors[who],url=base+path+'?'+new URLSearchParams({role:a.role,...query})
  const response=await fetch(url,{method:body?'POST':'GET',headers:{host:'qa.invalid',authorization:'Bearer '+a.token,...(body?{origin,'content-type':'application/json'}:{})},...(body?{body:JSON.stringify({role:a.role,...body})}:{})})
  const value=await response.json()
  assert.equal(response.status,expected,who+' '+path+': '+JSON.stringify(value).slice(0,300));checks++
  return value
 }
 for(const n of names){
  const a=actors[n],account=await call(n,'/onboard',{})
  const profiles=await call(n,'/profiles')
  a.accountId=account.id;a.profileId=profiles.profiles.find(p=>p.role===a.role).id
 }
 await admin.query('INSERT INTO matchter.mediation_administrators(account_id) VALUES($1)',[actors.mediator.accountId])
 await admin.query('INSERT INTO matchter.inspector_administrators(account_id) VALUES($1)',[actors.mediator.accountId])
 await admin.query('INSERT INTO matchter.payment_administrators(account_id) VALUES($1)',[actors.mediator.accountId])
 for(const n of ['inspector','alternative'])await admin.query('INSERT INTO matchter.inspector_registry(profile_id,display_name,specialty,service_area,enabled,verified_at) VALUES($1,$2,$3,$4,true,now())',[actors[n].profileId,'QA '+n,'Inspección','Temuco prueba'])
 await call('client','/admin/payments',null,403)
 const policy=await call('mediator','/admin/payments')
 assert.equal(policy.verifiedCustody,false);assert.equal(policy.availability,'direct-only')
 await call('mediator','/admin/payments',{availability:'both',revision:policy.revision,role:undefined},409)
 const requestId=randomUUID()
 await admin.query("INSERT INTO matchter.swipe_requests(id,sender_profile_id,recipient_profile_id,dedupe_key,details,status,responded_at) VALUES($1,$2,$3,repeat('a',64),$4,'accepted',now())",[requestId,actors.client.profileId,actors.provider.profileId,JSON.stringify({projectTitle:'Obra QA'})])
 const data={title:'Obra de prueba',scope:'Trabajos ficticios para validar el circuito.',start:'2026-12-01',end:'2026-12-31',totalAmount:100000,stages:[['Etapa QA','2026-12-31',100000,100]]}
 await call('client','/messages/agreement',{requestId,action:'propose',expectedVersion:0,data})
 await call('provider','/messages/agreement',{requestId,action:'confirm',expectedVersion:1})
 const chosen=await call('client','/messages/contract',{requestId,action:'choose',agreementVersion:1,expectedRevision:0,mode:'simple'})
 const contract=chosen.contract;assert.equal(contract.terms.paymentMode,'direct')
 const signature={requestId,action:'confirm',agreementVersion:1,expectedRevision:contract.revision,digest:contract.digest,accepted:true,identityDemo:true,identityChecks:{front:true,back:true,selfie:true}}
 await call('client','/messages/contract',signature);await call('provider','/messages/contract',signature)
 const fee={requestId,agreementVersion:1,expectedRevision:contract.revision,digest:contract.digest,accepted:true,demoAmount:2990}
 const sandboxAttempts=createSandboxPaymentAttempts({db,verifyIdentity,mode:'isolated_test'})
 const auth=who=>'Bearer '+actors[who].token
 const baseAttempt={role:'Cliente',requestId,agreementVersion:1,contractRevision:contract.revision,digest:contract.digest,provider:'khipu',submissionId:randomUUID()}
 await assert.rejects(sandboxAttempts.reserve(auth('alternative'),{...baseAttempt,role:'Profesional'}),{status:404})
 await assert.rejects(sandboxAttempts.reserve(auth('client'),{...baseAttempt,amountCLP:1}),{status:400})
 await assert.rejects(sandboxAttempts.reserve(auth('client'),{...baseAttempt,digest:'0'.repeat(64)}),{status:409})
 const reserved=await sandboxAttempts.reserve(auth('client'),baseAttempt)
 assert.equal(reserved.amountCLP,2990);assert.equal(reserved.realPayment,false)
 assert.equal((await sandboxAttempts.reserve(auth('client'),baseAttempt)).id,reserved.id)
 await assert.rejects(sandboxAttempts.reserve(auth('client'),{...baseAttempt,provider:'mercadopago',submissionId:randomUUID()}),{status:409})
 await assert.rejects(sandboxAttempts.read(auth('provider'),{role:actors.provider.role,attemptId:reserved.id}),{status:404})
 assert.equal((await sandboxAttempts.cancelUnsent(auth('client'),{role:'Cliente',attemptId:reserved.id})).state,'cancelled_unsent')
 const race=await Promise.allSettled(['khipu','mercadopago'].map(provider=>sandboxAttempts.reserve(auth('client'),{...baseAttempt,provider,submissionId:randomUUID()})))
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(race.find(r=>r.status==='rejected').reason.status,409)
 const winnerAttempt=race.find(r=>r.status==='fulfilled').value
 assert.equal((await sandboxAttempts.markDispatchUnknown(winnerAttempt.id,actors.client.profileId)).state,'creation_unknown')
 await assert.rejects(sandboxAttempts.cancelUnsent(auth('client'),{role:'Cliente',attemptId:winnerAttempt.id}),{status:409})
 await assert.rejects(sandboxAttempts.reserve(auth('client'),{...baseAttempt,submissionId:randomUUID()}),{status:409})
 const otherAttempt=await sandboxAttempts.reserve(auth('provider'),{...baseAttempt,provider:winnerAttempt.provider==='khipu'?'mercadopago':'khipu',role:actors.provider.role,submissionId:randomUUID()})
 assert.notEqual(otherAttempt.id,winnerAttempt.id)
 await sandboxAttempts.markDispatchUnknown(otherAttempt.id,actors.provider.profileId)
 const reconciliation=createSandboxReconciliation({db,mode:'isolated_test',merchants:{khipu:'9876',mercadopago:'9876'}})
 const ka=[winnerAttempt,otherAttempt].find(a=>a.provider==='khipu'),ma=[winnerAttempt,otherAttempt].find(a=>a.provider==='mercadopago')
 const kc={payment_id:'abc123def456',payment_url:'https://khipu.com/payment/info/abc123def456'}
 const mc={id:'qa-pref-1',collector_id:9876,external_reference:ma.id,sandbox_init_point:'https://sandbox.mercadopago.cl/checkout/pay'}
 await assert.rejects(reconciliation.bindCheckout(reserved.id,kc),{status:409})
 assert.equal((await reconciliation.bindCheckout(ka.id,kc)).status,'checkout_created')
 assert.equal((await reconciliation.bindCheckout(ka.id,kc)).status,'checkout_created')
 await assert.rejects(reconciliation.bindCheckout(ka.id,{...kc,payment_id:'abc123def457'}),{status:409})
 assert.equal((await reconciliation.bindCheckout(ma.id,mc)).status,'checkout_created')
 const kp={payment_id:kc.payment_id,receiver_id:9876,transaction_id:ka.id,currency:'CLP',amount:'2990.00',status:'done',status_detail:'normal',out_of_date_conciliation:false,bank_account_number:'QA-private'}
 const mp={id:'123456789',collector_id:9876,external_reference:ma.id,currency_id:'CLP',transaction_amount:2990,live_mode:false,status:'approved',status_detail:'accredited',payment_type_id:'debit_card',transaction_amount_refunded:0,order:{type:'mercadopago',id:'123'},payer:{email:'qa@example.invalid'}}
 const link={paymentId:mp.id,merchantOrder:{id:'123',preference_id:mc.id,external_reference:ma.id,collector:{id:9876},payments:[{id:mp.id}]}}
 await assert.rejects(reconciliation.observe(ma.id,mp,{...link,merchantOrder:{...link.merchantOrder,preference_id:'wrong'}}),{status:409})
 await assert.rejects(reconciliation.observe(ka.id,{...kp,amount:2991}))
 assert.equal((await reconciliation.observe(ka.id,{...kp,status:'verifying',status_detail:'pending'})).status,'pending')
 assert.equal((await reconciliation.observe(ka.id,kp)).status,'verified_test')
 assert.equal((await reconciliation.observe(ka.id,kp)).status,'verified_test')
 assert.equal((await reconciliation.observe(ma.id,{...mp,status:'rejected'},link)).status,'declined')
 assert.equal((await reconciliation.observe(ma.id,mp,link)).status,'verified_test')
 assert.equal((await reconciliation.observe(ka.id,{...kp,status_detail:'fully-refunded'})).status,'review')
 assert.equal((await reconciliation.observe(ka.id,kp)).status,'review')
 assert.equal((await reconciliation.observe(ma.id,{...mp,status:'refunded'},link)).status,'review')
 assert.equal((await db.query('SELECT count(*)::int n FROM matchter.sandbox_payment_observations')).rows[0].n,6)
 assert.equal((await db.query("SELECT has_table_privilege(current_user,'matchter.sandbox_payment_observations','UPDATE') AS can_rewrite")).rows[0].can_rewrite,false)
 console.log('SANDBOX RECONCILIATION QA PASSED: both providers, strict linkage, duplicate observation, decline, refund review; no provider calls')
 assert.equal((await db.query("SELECT count(*)::int n FROM matchter.sandbox_payment_attempts WHERE request_id=$1",[requestId])).rows[0].n,3)
 assert.deepEqual((await db.query("SELECT has_table_privilege(current_user,'matchter.sandbox_payment_attempts','DELETE') AS can_delete,has_table_privilege(current_user,'matchter.sandbox_payment_attempt_events','UPDATE') AS can_rewrite")).rows[0],{can_delete:false,can_rewrite:false})
 console.log('SANDBOX PAYMENT RESERVATIONS QA PASSED: persistent idempotency, concurrent cross-provider exclusion, cancellation before dispatch, ambiguous outcome blocks retry, private ownership; no provider calls')
 const pendingWallet=await call('client','/messages/wallet')
 assert.equal(pendingWallet.movements.length,1)
 assert.equal(pendingWallet.movements[0].status,'pending_demo')
 await call('client','/messages/wallet/receipt',null,409,{movementId:pendingWallet.movements[0].id})
 await call('client','/messages/contract',{...fee,action:'payServiceFeeDemo'})
 const clientWallet=await call('client','/messages/wallet')
 assert.equal(clientWallet.movements.length,1)
 assert.equal(clientWallet.movements[0].status,'recorded_demo')
 assert.equal(clientWallet.movements[0].amountCLP,2990)
 assert.equal(clientWallet.realPaymentsEnabled,false)
 await assert.rejects(sandboxAttempts.reserve(auth('client'),{...baseAttempt,submissionId:randomUUID()}),{status:409})
 const receipt=await call('client','/messages/wallet/receipt',null,200,{movementId:clientWallet.movements[0].id})
 assert.equal(receipt.realPayment,false);assert.equal(receipt.taxDocument,false);assert.match(receipt.reference,/^DEMO-/)
 assert.equal(receipt.movement.amountCLP,2990)
 assert.deepEqual(await call('client','/messages/wallet/receipt',null,200,{movementId:receipt.movement.id}),receipt)
 await call('provider','/messages/wallet/receipt',null,409,{movementId:receipt.movement.id})
 await call('alternative','/messages/wallet/receipt',null,404,{movementId:receipt.movement.id})
 const {buildWalletReceipt}=await import('../client/src/features/auth/walletReceiptPdf.js')
 assert.equal(Buffer.from(buildWalletReceipt(receipt).subarray(0,5)).toString(),'%PDF-')
 const providerPending=await call('provider','/messages/wallet')
 assert.equal(providerPending.movements.length,1)
 assert.equal(providerPending.movements[0].status,'pending_demo')
 assert.equal(providerPending.movements[0].recordedAt,null)
 assert.deepEqual((await call('alternative','/messages/wallet')).movements,[])
 await call('client','/messages/contract',{...fee,action:'payServiceFeeDemo'})
 assert.equal((await call('client','/messages/wallet')).movements.length,1)
 await call('provider','/messages/contract',{...fee,action:'payProviderFeeDemo'})
 const providerWallet=await call('provider','/messages/wallet')
 assert.equal(providerWallet.movements.length,1)
 assert.equal(providerWallet.movements[0].status,'recorded_demo')
 assert.equal(providerWallet.movements[0].amountCLP,2990)
 assert.equal(providerWallet.realPaymentsEnabled,false)
 const providerReceipt=await call('provider','/messages/wallet/receipt',null,200,{movementId:providerWallet.movements[0].id})
 assert.notEqual(providerReceipt.reference,receipt.reference)
 assert.equal(providerReceipt.role,'Maestro o contratista')
 assert.equal(JSON.stringify(providerWallet).includes('providerFeeMode'),false)
 const stage={requestId,agreementVersion:1,contractRevision:contract.revision,digest:contract.digest,stageNo:1,accepted:true}
 await call('client','/messages/stages',{...stage,action:'fund'},400)
 await call('provider','/messages/stages',{...stage,action:'start'})
 const progress=await call('provider','/messages/stages',{...stage,action:'progress',progressPercent:50})
 assert.equal(progress.stages[0].progressPercent,50)
 assert.equal((await call('client','/messages/workflow',null,200,{requestId})).claimsAvailable,true)
 const claimBody={requestId,agreementVersion:1,contractRevision:contract.revision,digest:contract.digest,stageNo:1,submissionId:randomUUID(),reason:'quality_scope',description:'Descripción sintética de defectos observados.',requestedResolution:'Revisar los trabajos.',contractReference:''}
 const {claim}=await call('client','/messages/claims',claimBody)
 assert.equal((await call('client','/messages/claims',claimBody)).claim.id,claim.id)
 const claimId=claim.id
 const claimFile={claimId,submissionId:randomUUID(),filename:'reclamo-qa.pdf',mediaType:'application/pdf',base64:Buffer.from('%PDF-1.7 QA claim fixture').toString('base64')}
 await call('alternative','/messages/mediation/evidence',claimFile,404)
 const evidence=await call('client','/messages/mediation/evidence',claimFile)
 assert.equal(evidence.files.length,1)
 assert.equal((await call('client','/messages/mediation/evidence',claimFile)).files.length,1)
 assert.equal((await call('provider','/messages/mediation/evidence-file',null,200,{claimId,fileId:evidence.files[0].id})).base64,claimFile.base64)
 await call('provider','/messages/mediation/evidence',{...claimFile,submissionId:randomUUID(),base64:'wrong'},400)
 await call('alternative','/messages/mediation/evidence-file',null,404,{claimId,fileId:evidence.files[0].id})
 const notices=await call('provider','/messages/case-notices')
 const newClaim=notices.notices.find(n=>n.claimId===claimId&&n.kind==='claim');assert.ok(newClaim&&!newClaim.read)
 const read=await call('provider','/messages/case-notices/read',{ids:[newClaim.id]});assert.equal(read.notices.find(n=>n.id===newClaim.id).read,true)
 await call('alternative','/messages/case-notices/read',{ids:[newClaim.id]},404)
 const med=(who,action,text,reference,expected=200)=>call(who,who==='mediator'?'/admin/mediation/case':'/messages/mediation',{claimId,submissionId:randomUUID(),action,text,reference},expected)
 await call('alternative','/messages/mediation',null,404,{claimId})
 await med('mediator','review')
 const invited=await med('mediator','invite')
 await med('client','join',undefined,invited.invitation)
 await med('provider','join',undefined,invited.invitation)
 const proposed=await med('mediator','propose','Solución de mediación de prueba.')
 await med('client','decision_decline',undefined,proposed.proposal.id)
 const closed=await med('provider','decision_decline',undefined,proposed.proposal.id)
 assert.equal(closed.status,'closed_without_agreement');assert.equal(closed.contractReminder.available,true)
 await med('client','inspection','Solicito evaluación independiente.')
 const directory=await call('client','/messages/inspections',null,200,{claimId})
 assert.equal(directory.inspectors.length,2)
 const select=async n=>(await call('client','/messages/inspections/select',{claimId,inspectorProfileId:actors[n].profileId,scope:'Consulta ficticia de inspección independiente.'})).order
 const first=await select('inspector'),second=await select('alternative')
 assert.equal((await select('inspector')).id,first.id)
 const change=async(who,orderId,action,input,expected=200,submissionId=randomUUID())=>call(who,'/messages/inspections/change',{orderId,submissionId,action,input},expected)
 await change('client',first.id,'message',{text:'PRIVATE_QA_TEXT'})
 const inbox=await call('inspector','/messages/inspections/inbox')
 assert.equal(inbox.orders[0].messages[0].text,'PRIVATE_QA_TEXT')
 await call('provider','/messages/inspections/conversation',null,404,{orderId:first.id})
 const quote={scope:'Evaluación técnica de trabajos pendientes.',feeCLP:50000,validUntil:new Date(Date.now()+86400000).toISOString()}
 const quoted=(await change('inspector',first.id,'quote',quote)).order
 const alt=(await change('alternative',second.id,'quote',{...quote,feeCLP:60000})).order
 await change('client',first.id,'accept',{quoteId:quoted.quote.id,feeCLP:1,accepted:true},409)
 const accept1={quoteId:quoted.quote.id,feeCLP:50000,accepted:true}
 const accept2={quoteId:alt.quote.id,feeCLP:60000,accepted:true}
 // Race two simultaneous selections: exactly one must win.
 const attempts=await Promise.all([first,second].map(async(o,i)=>{
  const a=actors.client,res=await fetch(base+'/messages/inspections/change',{method:'POST',headers:{host:'qa.invalid',authorization:'Bearer '+a.token,origin,'content-type':'application/json'},body:JSON.stringify({role:a.role,orderId:o.id,submissionId:randomUUID(),action:'accept',input:i?accept2:accept1})})
  return {status:res.status,orderId:o.id,data:await res.json(),who:i?'alternative':'inspector'}
 }))
 assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);checks+=2
 const winner=attempts.find(x=>x.status===200),loser=attempts.find(x=>x.status===409)
 const orderId=winner.orderId
 const shared=await call('provider','/messages/inspections',null,200,{claimId})
 assert.equal(shared.orders.length,1);assert.equal(shared.orders[0].quote,null);assert.deepEqual(shared.orders[0].messages,[])
 const report={visitedAt:new Date().toISOString(),findings:'Evaluación ficticia de las partidas pendientes.',limitations:'Inspección visual de prueba.',items:[{kind:'completion',description:'Terminaciones',amountCLP:25000}]}
 await change(loser.who,loser.orderId,'report',report,409)
 await change('client',orderId,'report',report,409)
 const delivered=(await change(winner.who,orderId,'report',report)).order
 assert.equal(delivered.report.estimateCLP,25000)
 const file={orderId,submissionId:randomUUID(),filename:'informe-qa.pdf',mediaType:'application/pdf',base64:Buffer.from('%PDF-1.7 QA fixture').toString('base64')}
 await call('client','/messages/inspections/attachments',file,403)
 const uploaded=await call(winner.who,'/messages/inspections/attachments',file)
 assert.equal(uploaded.files.length,1)
 assert.equal((await call(winner.who,'/messages/inspections/attachments',file)).files.length,1)
 const fileId=uploaded.files[0].id
 assert.equal((await call('provider','/messages/inspections/attachment',null,200,{orderId,fileId})).base64,file.base64)
 await call(loser.who,'/messages/inspections/attachment',null,404,{orderId,fileId})
 const record=await call('mediator','/admin/mediation/case',null,200,{claimId})
 assert.equal(record.inspection.id,orderId);assert.equal(record.inspection.report.estimateCLP,25000)
 assert.equal(record.inspection.quote,null);assert.deepEqual(record.inspection.messages,[])
 assert.equal(JSON.stringify(record).includes('PRIVATE_QA_TEXT'),false)
 const reportId=record.inspectionResolution.reportId
 await med('client','inspection_observation','Observación sintética.',reportId)
 const final=await med('mediator','inspection_propose','Solución posterior al informe.',reportId)
 await med('client','inspection_accept',undefined,final.inspectionResolution.proposal.id)
 const result=await med('provider','inspection_accept',undefined,final.inspectionResolution.proposal.id)
 assert.equal(result.inspectionResolution.status,'closed_with_agreement')
 const exported=await call('provider','/messages/mediation/export',null,200,{claimId})
 assert.equal(exported.contract.digest,contract.digest);assert.equal(exported.case.inspectionResolution.status,'closed_with_agreement')
 assert.equal(JSON.stringify(exported).includes('PRIVATE_QA_TEXT'),false)
 assert.equal((await admin.query('SELECT count(*)::int AS n FROM matchter.project_stage_demos')).rows[0].n,0)
 console.log('AUTHENTICATED HTTP QA PASSED:',checks,'requests; real isolated PostgreSQL; no financial transfers')
 const {verifyCaseInterface}=await import('./qa-case-interface.mjs')
 await verifyCaseInterface({actors,winner,claimId,requestId,base,http:fetch})
 const {buildCasePdf,buildCaseArchive}=await import('../client/src/features/auth/caseDossier.js')
 const {unzipSync}=await import('fflate')
 assert.equal(exported.evidence.length,1);assert.equal(exported.inspectionFiles.length,1)
 const pdf=buildCasePdf(exported);assert.equal(Buffer.from(pdf.subarray(0,5)).toString(),'%PDF-')
 const archive=await buildCaseArchive(exported,async(kind,fileId)=>kind==='reclamo'?call('provider','/messages/mediation/evidence-file',null,200,{claimId,fileId}):call('provider','/messages/inspections/attachment',null,200,{orderId,fileId}),bytes=>createHash('sha256').update(bytes).digest('hex'))
 const originals=unzipSync(archive);assert.equal(Object.keys(originals).length,4)
 assert.ok(Object.keys(originals).some(k=>k.startsWith('reclamo/')&&k.endsWith('reclamo-qa.pdf')))
 assert.ok(Object.keys(originals).some(k=>k.startsWith('inspeccion/')&&k.endsWith('informe-qa.pdf')))
 assert.equal(JSON.stringify(exported).includes('PRIVATE_QA_TEXT'),false)
 await call('provider','/messages/mediation/evidence',{...claimFile,submissionId:randomUUID()},409)
 await change(winner.who,orderId,'cancel',{reason:'Informe ya entregado'},409)
 // Separate case for a cancellation and replacement; do not modify closed report.
 const replacementClaim=(await call('client','/messages/claims',{...claimBody,submissionId:randomUUID(),description:'Segunda controversia ficticia para validar reemplazo.'})).claim
 const rid=replacementClaim.id
 const m2=(who,action,text,reference)=>call(who,who==='mediator'?'/admin/mediation/case':'/messages/mediation',{claimId:rid,submissionId:randomUUID(),action,text,reference})
 await m2('mediator','review');const inv=await m2('mediator','invite')
 await m2('client','join',undefined,inv.invitation);await m2('provider','join',undefined,inv.invitation)
 const p2=await m2('mediator','propose','Propuesta de prueba para reemplazo.')
 await m2('client','decision_decline',undefined,p2.proposal.id);await m2('provider','decision_decline',undefined,p2.proposal.id)
 await m2('client','inspection','Solicitud de inspección de reemplazo.')
 const open2=async n=>(await call('client','/messages/inspections/select',{claimId:rid,inspectorProfileId:actors[n].profileId,scope:'Consulta ficticia de inspección de reemplazo.'})).order
 const original=await open2('inspector'),replacement=await open2('alternative')
 const oq=(await change('inspector',original.id,'quote',quote)).order,rq=(await change('alternative',replacement.id,'quote',quote)).order
 await change('client',original.id,'accept',{quoteId:oq.quote.id,feeCLP:50000,accepted:true})
 const cancelled=(await change('inspector',original.id,'cancel',{reason:'No puedo asistir a la visita.'})).order
 assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.caseAwarded,false)
 await change('client',original.id,'accept',{quoteId:oq.quote.id,feeCLP:50000,accepted:true},409)
 const replacementAward=(await change('client',replacement.id,'accept',{quoteId:rq.quote.id,feeCLP:50000,accepted:true})).order
 assert.equal(replacementAward.awarded,true)
 const archived=await call('client','/messages/mediation/export',null,200,{claimId:rid})
 assert.equal(archived.cancellations.length,1);assert.equal(archived.inspection.id,replacement.id)
 await call('client','/admin/inspectors',null,403)
 const registry=await call('mediator','/admin/inspectors')
 assert.equal(registry.profiles.length,2)
 const verification={role:undefined,profileId:actors.inspector.profileId,displayName:'Inspector QA revisado',specialty:'ITO de prueba',serviceArea:'Temuco prueba',enabled:true,reason:'Verificación manual de antecedentes de prueba.',credentialsReviewed:true}
 await call('mediator','/admin/inspectors',{...verification,credentialsReviewed:false},400)
 await call('mediator','/admin/inspectors',{...verification,profileId:actors.mediator.profileId},403)
 await call('mediator','/admin/inspectors',verification)
 assert.equal((await admin.query('SELECT count(*)::int AS n FROM matchter.inspector_registry_events')).rows[0].n,1)
 const inspectorNotices=await call('inspector','/messages/case-notices')
 assert.ok(inspectorNotices.notices.some(n=>n.kind==='inspection_request'))
 assert.equal(JSON.stringify(inspectorNotices).includes('PRIVATE_QA_TEXT'),false)
 console.log('CASE COMPLETION QA PASSED:',checks,'total HTTP requests; evidence, notice reads, cancellation, admin and PDF/ZIP')

}finally{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await admin.end()}
