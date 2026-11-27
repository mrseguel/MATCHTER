import {AuthError} from './identityAccounts.js'
import {formalState,nextFormalEvent} from './formalClaimFlow.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail=(s,m)=>{throw new AuthError(s,m)}
const view=r=>{const {fingerprint,...data}=r.data;return {id:r.id,...data,recordedAt:r.recordedAt}}
export function createFormalClaimService({db,verifyIdentity,clock=Date.now}){
 async function context(q,header,role,id){
  if(typeof id!=='string'||!uuid.test(id))fail(400,'Reclamo no válido')
  const identity=await verifyIdentity(header)
  const a=(await q.query('SELECT p.id,p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
  if(!a||a.role!==role)fail(403,'Acceso no autorizado')
  const c=(await q.query("SELECT c.id,c.reporter_profile_id AS reporter,r.sender_profile_id AS sender,r.recipient_profile_id AS recipient FROM matchter.stage_claims c JOIN matchter.swipe_requests r ON r.id=c.request_id WHERE c.id=$1 AND r.status='accepted' AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)",[id,a.id])).rows[0]
  if(!c)fail(404,'Reclamo no disponible')
  return {actor:a.id,side:c.sender===a.id?'client':'provider',reporter:c.sender===c.reporter?'client':'provider'}
 }
 async function events(q,id){return (await q.query('SELECT id,data,recorded_at AS "recordedAt" FROM matchter.formal_claim_events WHERE claim_id=$1 ORDER BY seq',[id])).rows.map(view)}
 async function detail(q,id,a){return {claimId:id,code:'REC-'+id.toUpperCase(),side:a.side,...formalState(await events(q,id),clock())}}
 return Object.freeze({
 async get(header,{role,claimId}){return detail(db,claimId,await context(db,header,role,claimId))},
 async change(header,body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['role','claimId','submissionId','action','message','reference'].includes(k))||!uuid.test(body.submissionId||'')||typeof body.action!=='string')fail(400,'Actuación no válida')
  const tx=await db.connect()
  try{
   await tx.query('BEGIN');const a=await context(tx,header,body.role,body.claimId)
   await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('mediation:'||$1::text,0))",[body.claimId])
   const prior=(await tx.query('SELECT data FROM matchter.formal_claim_events WHERE claim_id=$1 AND actor_profile_id=$2 AND submission_id=$3',[body.claimId,a.actor,body.submissionId])).rows[0]
   const fingerprint=JSON.stringify([body.action,body.message??null,body.reference??null])
   if(prior){if(prior.data.fingerprint!==fingerprint)fail(409,'Identificador ya utilizado')}
   else {
    // Do not start/modify an already mediated legacy case. Existing mediation routes are not enabled for formal QA.
    if((await tx.query('SELECT 1 FROM matchter.stage_claim_events WHERE claim_id=$1 LIMIT 1',[body.claimId])).rows.length)fail(409,'Este reclamo ya tiene mediación registrada')
    let e;try{e=nextFormalEvent({events:await events(tx,body.claimId),side:a.side,reporter:a.reporter,action:body.action,message:body.message,reference:body.reference,now:clock()})}catch(err){if(err.status)fail(err.status,err.message);throw err}
    await tx.query('INSERT INTO matchter.formal_claim_events(claim_id,actor_profile_id,submission_id,data) VALUES($1,$2,$3,$4)',[body.claimId,a.actor,body.submissionId,JSON.stringify({...e,fingerprint})])
   }
   const result=await detail(tx,body.claimId,a);await tx.query('COMMIT');return result
  }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
 }
 })
}
