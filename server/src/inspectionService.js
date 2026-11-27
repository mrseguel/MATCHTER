import {AuthError} from './identityAccounts.js'
import {mediationState} from './mediationFlow.js'
import {inspectionState,nextInspectionEvent} from './inspectionLifecycle.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const id=v=>{if(typeof v!=='string'||!uuid.test(v))throw new AuthError(400,'Identificador no válido');return v}
const fail=(status,message)=>{throw new AuthError(status,message)}
const shape=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))fail(400,'Datos de inspección no válidos')}
const registryFields='i.profile_id AS "profileId",i.display_name AS "displayName",i.specialty,i.service_area AS "serviceArea"'
const rowFields='o.id,o.claim_id AS "caseId",o.requester_profile_id AS "requesterProfileId",o.inspector_profile_id AS "inspectorProfileId",o.scope,o.created_at AS "createdAt",rp.account_id AS "requesterAccountId",ip.account_id AS "inspectorAccountId",ip.role AS "inspectorRole",i.enabled,i.verified_at AS "verifiedAt",i.display_name AS "displayName",i.specialty,i.service_area AS "serviceArea",cp.account_id AS "clientAccountId",pp.account_id AS "providerAccountId",r.sender_profile_id AS "clientProfileId",r.recipient_profile_id AS "providerProfileId"'
const joins=' FROM matchter.inspection_orders o JOIN matchter.stage_claims c ON c.id=o.claim_id JOIN matchter.swipe_requests r ON r.id=c.request_id JOIN matchter.account_profiles cp ON cp.id=r.sender_profile_id JOIN matchter.account_profiles pp ON pp.id=r.recipient_profile_id JOIN matchter.account_profiles rp ON rp.id=o.requester_profile_id JOIN matchter.account_profiles ip ON ip.id=o.inspector_profile_id JOIN matchter.inspector_registry i ON i.profile_id=ip.id'
async function actor(q,verifyIdentity,header,role){
 const identity=await verifyIdentity(header)
 const a=(await q.query('SELECT a.id AS "accountId",p.id AS "profileId",p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
 if(!a||a.role!==role)fail(403,'Perfil no autorizado')
 return a
}
async function caseFor(q,claimId,a,lock=false){
 const c=(await q.query(`SELECT c.id,c.data,r.sender_profile_id AS "clientProfileId",r.recipient_profile_id AS "providerProfileId",cp.account_id AS "clientAccountId",pp.account_id AS "providerAccountId" FROM matchter.stage_claims c JOIN matchter.swipe_requests r ON r.id=c.request_id JOIN matchter.account_profiles cp ON cp.id=r.sender_profile_id JOIN matchter.account_profiles pp ON pp.id=r.recipient_profile_id WHERE c.id=$1 AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)`+(lock?' FOR UPDATE OF c':''),[id(claimId),a.profileId])).rows[0]
 if(!c)fail(404,'Expediente no disponible')
 const events=(await q.query('SELECT id,data FROM matchter.stage_claim_events WHERE claim_id=$1 ORDER BY seq',[claimId])).rows.map(r=>({id:r.id,...r.data}))
 const s=mediationState(events),side=c.clientProfileId===a.profileId?'client':'provider'
 if(c.data.mode!=='direct'||s.status!=='closed_without_agreement')fail(409,'Inspección no disponible en esta modalidad o estado')
 return {...c,side,requested:s.inspectionRequested.includes(side)}
}
async function directory(q,c){
 return (await q.query('SELECT '+registryFields+' FROM matchter.inspector_registry i JOIN matchter.account_profiles p ON p.id=i.profile_id WHERE i.enabled AND i.verified_at IS NOT NULL AND p.role=\'Profesional\' AND p.account_id NOT IN ($1,$2) AND NOT EXISTS (SELECT 1 FROM matchter.stage_claim_events e WHERE e.claim_id=$3 AND e.actor_account_id=p.account_id AND e.data->>\'side\'=\'mediator\') ORDER BY i.display_name,i.profile_id LIMIT 100',[c.clientAccountId,c.providerAccountId,c.id])).rows
}
async function orderRow(q,orderId,a,lock=false){
 const r=(await q.query('SELECT '+rowFields+joins+' WHERE o.id=$1 AND ($2=o.inspector_profile_id OR $2=r.sender_profile_id OR $2=r.recipient_profile_id)'+(lock?' FOR UPDATE OF o':''),[id(orderId),a.profileId])).rows[0]
 if(!r)fail(404,'Inspección no disponible')
 return r
}
async function eventsFor(q,orderId){return (await q.query('SELECT id,data FROM matchter.inspection_order_events WHERE order_id=$1 ORDER BY seq',[orderId])).rows.map(r=>{const {fingerprint,...event}=r.data;return {id:r.id,...event}})}
function view(r,events,a){
 const s=inspectionState(events),own=r.requesterProfileId===a.profileId,assigned=r.inspectorProfileId===a.profileId
 const q=s.quote,quote=q?{id:q.id,scope:q.scope,feeCLP:q.feeCLP,currency:q.currency,validUntil:q.validUntil}:null
 return {id:r.id,caseId:r.caseId,scope:r.scope,createdAt:r.createdAt,own,assigned,requesterSide:r.requesterProfileId===r.clientProfileId?'client':'provider',inspector:{displayName:r.displayName,specialty:r.specialty,serviceArea:r.serviceArea},status:s.status,quote,visit:s.visit,report:s.report,noMoneyMoved:true}
}
export function createInspectionService({db,verifyIdentity}){
 const getActor=(q,header,role)=>actor(q,verifyIdentity,header,role)
 return Object.freeze({
  async caseView(header,query){
   const a=await getActor(db,header,query.role),c=await caseFor(db,query.claimId,a)
   const r=(await db.query('SELECT '+rowFields+joins+' WHERE o.claim_id=$1',[c.id])).rows[0]
   return {order:r?view(r,await eventsFor(db,r.id),a):null,canSelect:c.requested&&!r,inspectors:c.requested&&!r?await directory(db,c):[]}
  },
  async select(header,body){
   shape(body,['role','claimId','inspectorProfileId','scope'])
   id(body.inspectorProfileId)
   if(typeof body.scope!=='string'||body.scope.trim().length<20||body.scope.length>4000)fail(400,'Describe el alcance de la inspección (20 a 4000 caracteres)')
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await getActor(tx,header,body.role),c=await caseFor(tx,body.claimId,a,true)
    if(!c.requested)fail(409,'Primero registra tu solicitud de inspección')
    const previous=(await tx.query('SELECT '+rowFields+joins+' WHERE o.claim_id=$1',[c.id])).rows[0]
    if(previous){
     if(previous.requesterProfileId!==a.profileId||previous.inspectorProfileId!==body.inspectorProfileId||previous.scope!==body.scope.trim())fail(409,'El expediente ya tiene una solicitud de cotización')
     const result=view(previous,await eventsFor(tx,previous.id),a);await tx.query('COMMIT');return {order:result}
    }
    const eligible=(await directory(tx,c)).some(i=>i.profileId===body.inspectorProfileId)
    if(!eligible)fail(403,'Profesional independiente no disponible')
    const {id:orderId}=(await tx.query('INSERT INTO matchter.inspection_orders(claim_id,requester_profile_id,inspector_profile_id,scope) VALUES($1,$2,$3,$4) RETURNING id',[c.id,a.profileId,body.inspectorProfileId,body.scope.trim()])).rows[0]
    const r=await orderRow(tx,orderId,a);await tx.query('COMMIT');return {order:view(r,[],a)}
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  },
  async inbox(header,query){
   const a=await getActor(db,header,query.role)
   if(a.role!=='Profesional')fail(403,'Perfil profesional requerido')
   const registered=(await db.query('SELECT 1 FROM matchter.inspector_registry WHERE profile_id=$1 AND enabled AND verified_at IS NOT NULL',[a.profileId])).rows[0]
   if(!registered)return {enabled:false,orders:[]}
   const rows=(await db.query('SELECT '+rowFields+joins+' WHERE o.inspector_profile_id=$1 ORDER BY o.created_at DESC LIMIT 100',[a.profileId])).rows
   const orders=[];for(const r of rows)orders.push(view(r,await eventsFor(db,r.id),a))
   return {enabled:true,orders}
  },
  async change(header,body){
   shape(body,['role','orderId','submissionId','action','input']);id(body.submissionId)
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await getActor(tx,header,body.role),r=await orderRow(tx,body.orderId,a,true)
    if(![r.requesterProfileId,r.inspectorProfileId].includes(a.profileId))fail(403,'Acción no autorizada')
    const fingerprint=JSON.stringify([body.action,body.input])
    const prior=(await tx.query('SELECT data FROM matchter.inspection_order_events WHERE order_id=$1 AND actor_profile_id=$2 AND submission_id=$3',[r.id,a.profileId,body.submissionId])).rows[0]
    if(prior){if(prior.data.fingerprint!==fingerprint)fail(409,'Identificador ya utilizado')}
    else{
     const conflicted=(await tx.query("SELECT 1 FROM matchter.stage_claim_events WHERE claim_id=$1 AND actor_account_id=$2 AND data->>'side'='mediator' LIMIT 1",[r.caseId,r.inspectorAccountId])).rows[0]
     const order={...r,partyAccountIds:[r.clientAccountId,r.providerAccountId],inspector:{accountId:r.inspectorAccountId,profileId:r.inspectorProfileId,verified:!!r.verifiedAt,eligible:r.enabled===true&&r.inspectorRole==='Profesional'&&!conflicted&&![r.clientAccountId,r.providerAccountId].includes(r.inspectorAccountId)}}
     let event;try{event=nextInspectionEvent({order,events:await eventsFor(tx,r.id),actor:a,action:body.action,input:body.input})}catch(e){if([400,403,409].includes(e.status))fail(e.status,e.message);throw e}
     await tx.query('INSERT INTO matchter.inspection_order_events(order_id,actor_profile_id,submission_id,data) VALUES($1,$2,$3,$4)',[r.id,a.profileId,body.submissionId,JSON.stringify({...event,fingerprint})])
    }
    const result=view(r,await eventsFor(tx,r.id),a);await tx.query('COMMIT');return {order:result}
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  }
 })
}
