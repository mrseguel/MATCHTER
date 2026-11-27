// End-to-end HTTP QA, exclusively on an empty local PostgreSQL service in CI.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile,readdir} from 'node:fs/promises'
import express from 'express'
import pg from 'pg'
import {generateKeyPair,SignJWT} from 'jose'
import {createAuthRouter} from '../server/src/authPreviewRoutes.js'
import {createIdentityVerifier,createAccountService} from '../server/src/identityAccounts.js'
import {createProfilesService} from '../server/src/accountProfiles.js'
import {createMessagesService} from '../server/src/messagesService.js'
import {createPaymentAvailabilityService} from '../server/src/paymentAvailabilityService.js'
import {createMediationService} from '../server/src/mediationService.js'
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
 db=new Pool({host:'127.0.0.1',port:5432,database:'matchter_qa',user:'matchter_auth_app',password:'qa_app_local_only'})
 const {privateKey,publicKey}=await generateKeyPair('EdDSA')
 const verifyIdentity=createIdentityVerifier({issuer,audience:issuer,jwksUrl:issuer+'/.well-known/jwks.json',algorithms:['EdDSA']},publicKey)
 const paymentAvailability=createPaymentAvailabilityService({db,verifyIdentity})
 const service={...createAccountService({db,verifyIdentity}),profiles:createProfilesService({db,verifyIdentity}),paymentAvailability,messages:createMessagesService({db,verifyIdentity,paymentModeForNewContract:paymentAvailability.modeForNewContract,claimsEnabled:true}),mediation:createMediationService({db,verifyIdentity,inspectionsEnabled:true}),inspections:createInspectionService({db,verifyIdentity,attachmentsEnabled:true})}
 const app=express();app.use(express.json({limit:'1mb'}));app.use('/api/auth-preview',createAuthRouter({MATCHTER_AUTH_TEST_ORIGIN:origin,MATCHTER_NEON_AUTH_URL:'https://qa.neon.tech/auth',MATCHTER_STAGE_CLAIMS_ENABLED:'true',MATCHTER_MEDIATION_ENABLED:'true',MATCHTER_INSPECTIONS_ENABLED:'true',MATCHTER_INSPECTION_ATTACHMENTS_ENABLED:'true'},{service}))
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
 await call('client','/messages/contract',{...fee,action:'payServiceFeeDemo'})
 await call('provider','/messages/contract',{...fee,action:'payProviderFeeDemo'})
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
}finally{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.end();await admin.end()}
