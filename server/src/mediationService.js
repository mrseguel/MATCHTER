import {AuthError} from './identityAccounts.js'
import {mediationState,checkMediationAction} from './mediationFlow.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validId=x=>typeof x==='string'&&uuid.test(x)
const fields='e.id,e.data,e.recorded_at AS "recordedAt"'
const eventView=r=>{const {fingerprint,...data}=r.data;return {id:r.id,...data,recordedAt:r.recordedAt}}
const fail=(status,message)=>{throw new AuthError(status,message)}
async function eventsFor(q,claimId){return (await q.query('SELECT '+fields+' FROM matchter.stage_claim_events e WHERE e.claim_id=$1 ORDER BY e.seq',[claimId])).rows.map(eventView)}
async function context(q,claimId,actor,lock=false){
 if(!validId(claimId))fail(400,'Expediente no válido')
 // Only a participant in the underlying request or an independently authorized mediator may see a case.
 const c=(await q.query(`SELECT c.id,c.request_id AS "requestId",c.data,c.created_at AS "createdAt",r.sender_profile_id AS "senderId",r.recipient_profile_id AS "recipientId"
 FROM matchter.stage_claims c JOIN matchter.swipe_requests r ON r.id=c.request_id
 WHERE c.id=$1 AND ($3::boolean OR r.sender_profile_id=$2 OR r.recipient_profile_id=$2)`+(lock?' FOR UPDATE OF c':''),[claimId,actor.profileId??null,actor.mediator===true])).rows[0]
 if(!c)fail(404,'Expediente no disponible')
 const side=actor.mediator?'mediator':c.senderId===actor.profileId?'client':'provider'
 return {c,side}
}
async function detail(q,claimId,actor){
 const {c,side}=await context(q,claimId,actor)
 const events=await eventsFor(q,claimId)
 const {submissionId,...claim}=c.data
 return {id:c.id,requestId:c.requestId,claim,createdAt:c.createdAt,side,...mediationState(events)}
}
export function createMediationService({db,verifyIdentity}){
 async function actor(header,role,mediator,q=db){
  const identity=await verifyIdentity(header)
  const query=mediator?'SELECT a.id AS "accountId" FROM matchter.accounts a JOIN matchter.mediation_administrators m ON m.account_id=a.id WHERE a.auth_issuer=$1 AND a.auth_subject=$2':'SELECT a.id AS "accountId",p.id AS "profileId",p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2'
  const row=(await q.query(query,[identity.issuer,identity.subject])).rows[0]
  if(!row||(!mediator&&row.role!==role))fail(403,'Acceso no autorizado')
  return {...row,mediator}
 }
 return Object.freeze({
  async access(header){await actor(header,null,true);return {authorized:true}},
  async queue(header){await actor(header,null,true);const rows=(await db.query('SELECT id,request_id AS "requestId",data,created_at AS "createdAt" FROM matchter.stage_claims ORDER BY created_at DESC,id DESC LIMIT 100')).rows;return {cases:rows.map(r=>({id:r.id,requestId:r.requestId,createdAt:r.createdAt,projectTitle:r.data.projectTitle,stageNo:r.data.stageNo}))}},
  async get(header,query,mediator=false){return detail(db,query.claimId,await actor(header,query.role,mediator))},
  async change(header,body,mediator=false){
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['role','claimId','submissionId','action','text','reference'].includes(k))||!validId(body.claimId)||!validId(body.submissionId)||typeof body.action!=='string')fail(400,'Actuación no válida')
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await actor(header,body.role,mediator,tx)
    const {side}=await context(tx,body.claimId,a,true)
    const previous=(await tx.query('SELECT data FROM matchter.stage_claim_events WHERE claim_id=$1 AND actor_account_id=$2 AND submission_id=$3',[body.claimId,a.accountId,body.submissionId])).rows[0]
    const fingerprint=JSON.stringify([side,body.action,body.text??null,body.reference??null])
    if(previous){if(previous.data.fingerprint!==fingerprint)fail(409,'Identificador ya utilizado')}
    else{
     const events=await eventsFor(tx,body.claimId)
     let event
     try{event=checkMediationAction({events,side,action:body.action,text:body.text,reference:body.reference})}catch(e){if([400,403,409].includes(e.status))fail(e.status,e.message);throw e}
     await tx.query('INSERT INTO matchter.stage_claim_events(claim_id,actor_account_id,actor_profile_id,submission_id,data) VALUES($1,$2,$3,$4,$5)',[body.claimId,a.accountId,a.profileId??null,body.submissionId,JSON.stringify({...event,fingerprint})])
    }
    const result=await detail(tx,body.claimId,a)
    await tx.query('COMMIT');return result
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  }
 })
}
