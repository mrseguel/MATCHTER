import {validateInspectionAttachment} from './inspectionAttachment.js'
import {AuthError} from './identityAccounts.js'
import {mediationState} from './mediationFlow.js'
import {inspectionState,nextInspectionEvent} from './inspectionLifecycle.js'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const id=v=>{if(typeof v!=='string'||!uuid.test(v))throw new AuthError(400,'Identificador no válido');return v}
const fail=(status,message)=>{throw new AuthError(status,message)}
const shape=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))fail(400,'Datos de inspección no válidos')}
const registryFields='i.profile_id AS "profileId",i.display_name AS "displayName",i.specialty,i.service_area AS "serviceArea",COALESCE(public_card.bio,\'\') AS bio,COALESCE(public_card.city,\'\') AS city'
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
 return (await q.query('SELECT '+registryFields+' FROM matchter.inspector_registry i JOIN matchter.account_profiles p ON p.id=i.profile_id LEFT JOIN matchter.swipe_cards public_card ON public_card.profile_id=i.profile_id AND public_card.published=true WHERE i.enabled AND i.verified_at IS NOT NULL AND p.role=\'Profesional\' AND p.account_id NOT IN ($1,$2) AND NOT EXISTS (SELECT 1 FROM matchter.inspection_awards a JOIN matchter.inspection_orders o ON o.id=a.order_id WHERE a.claim_id=$3 AND a.cancelled_at IS NOT NULL AND o.inspector_profile_id=i.profile_id) AND NOT EXISTS (SELECT 1 FROM matchter.stage_claim_events e WHERE e.claim_id=$3 AND e.actor_account_id=p.account_id AND e.data->>\'side\'=\'mediator\') ORDER BY i.display_name,i.profile_id LIMIT 100',[c.clientAccountId,c.providerAccountId,c.id])).rows
}
async function orderRow(q,orderId,a,lock=false){
 const r=(await q.query('SELECT '+rowFields+joins+' WHERE o.id=$1 AND ($2=o.inspector_profile_id OR $2=r.sender_profile_id OR $2=r.recipient_profile_id)'+(lock?' FOR UPDATE OF o':''),[id(orderId),a.profileId])).rows[0]
 if(!r)fail(404,'Inspección no disponible')
 return r
}
async function eventsFor(q,orderId){return (await q.query('SELECT id,data,created_at AS "createdAt" FROM matchter.inspection_order_events WHERE order_id=$1 ORDER BY seq',[orderId])).rows.map(r=>{const {fingerprint,...event}=r.data;return {id:r.id,...event,createdAt:r.createdAt}})}
function view(r,events,a){
 const s=inspectionState(events),own=r.requesterProfileId===a.profileId,assigned=r.inspectorProfileId===a.profileId
 const cancelled=events.some(e=>e.action==='cancel')
 const messages=own||assigned?events.filter(e=>e.action==='message').map(e=>({id:e.id,text:e.text,author:e.author,createdAt:e.createdAt})):[]
 const q=s.quote,quote=(own||assigned)&&q?{id:q.id,scope:q.scope,feeCLP:q.feeCLP,currency:q.currency,validUntil:q.validUntil}:null
 return {id:r.id,caseId:r.caseId,scope:own||assigned?r.scope:null,createdAt:r.createdAt,own,assigned,requesterSide:r.requesterProfileId===r.clientProfileId?'client':'provider',inspector:{profileId:r.inspectorProfileId,displayName:r.displayName,specialty:r.specialty,serviceArea:r.serviceArea},status:cancelled?'cancelled':s.status,quote,messages,visit:s.visit,report:s.report,noMoneyMoved:true}
}
// Only call after the parent mediation case has been authorized.
export async function inspectionCaseRecord(q,claimId){
 const r=(await q.query('SELECT '+rowFields+joins+' WHERE o.id=(SELECT order_id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL)',[claimId])).rows[0]
 if(!r)return null
 const rows=(await q.query('SELECT id,actor_profile_id AS "actorProfileId",data,created_at AS "createdAt" FROM matchter.inspection_order_events WHERE order_id=$1 ORDER BY seq',[r.id])).rows
 const events=rows.filter(row=>!['message','quote','accept'].includes(row.data.action)).map(row=>{
  const {fingerprint,...e}=row.data
  if(e.quote){const {scope,feeCLP,currency,validUntil}=e.quote;e.quote={scope,feeCLP,currency,validUntil}}
  return {id:row.id,createdAt:row.createdAt,author:row.actorProfileId===r.inspectorProfileId?'inspector':row.actorProfileId===r.requesterProfileId?'requester':'unknown',...e}
 })
 const record=view(r,rows.map(row=>{const {fingerprint,...event}=row.data;return {id:row.id,...event}}),{profileId:null})
 return {...record,awarded:true,events,limitations:['Registro de prueba. No acredita pago ni visita de manera independiente.','Informe técnico sin firma profesional ni archivos originales adjuntos.','No constituye orden de deducción o liberación de fondos.']}
}
export function createInspectionService({db,verifyIdentity,attachmentsEnabled=false,clock=Date.now}){
 const getActor=(q,header,role)=>actor(q,verifyIdentity,header,role)
 const attachmentFields='id,filename,media_type AS "mediaType",octet_length(bytes) AS size,sha256,created_at AS "createdAt"'
 async function attachmentAccess(q,header,query,mediator=false){
  if(!attachmentsEnabled)fail(404,'Archivos aún no disponibles')
  const orderId=id(query.orderId)
  let r
  if(mediator){
   const identity=await verifyIdentity(header)
   const m=(await q.query('SELECT a.id FROM matchter.accounts a JOIN matchter.mediation_administrators m ON m.account_id=a.id WHERE a.auth_issuer=$1 AND a.auth_subject=$2',[identity.issuer,identity.subject])).rows[0]
   if(!m)fail(403,'Acceso no autorizado')
   r=(await q.query('SELECT '+rowFields+joins+' WHERE o.id=$1 AND $2 NOT IN (cp.account_id,pp.account_id,ip.account_id)',[orderId,m.id])).rows[0]
  }else{
   const a=await getActor(q,header,query.role)
   r=await orderRow(q,orderId,a)
  }
  if(!r||!(await q.query('SELECT 1 FROM matchter.inspection_awards WHERE claim_id=$1 AND order_id=$2 AND cancelled_at IS NULL',[r.caseId,r.id])).rows[0])fail(404,'Inspección no disponible')
  return r
 }
 return Object.freeze({
  async attachments(header,query,mediator=false){
   const r=await attachmentAccess(db,header,query,mediator)
   return {files:(await db.query('SELECT '+attachmentFields+' FROM matchter.inspection_attachments WHERE order_id=$1 ORDER BY created_at,id',[r.id])).rows}
  },
  async attachment(header,query,mediator=false){
   const r=await attachmentAccess(db,header,query,mediator)
   const file=(await db.query('SELECT '+attachmentFields+',bytes FROM matchter.inspection_attachments WHERE order_id=$1 AND id=$2',[r.id,id(query.fileId)])).rows[0]
   if(!file)fail(404,'Archivo no disponible')
   const {bytes,...metadata}=file;return {...metadata,base64:bytes.toString('base64')}
  },
  async addAttachment(header,body){
   shape(body,['role','orderId','submissionId','filename','mediaType','base64']);id(body.submissionId)
   if(!attachmentsEnabled)fail(404,'Archivos aún no disponibles')
   let file;try{file=validateInspectionAttachment(body)}catch(e){if(e.status===400)fail(400,e.message);throw e}
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const r=await attachmentAccess(tx,header,body)
    const a=await getActor(tx,header,body.role)
    if(a.profileId!==r.inspectorProfileId||a.accountId!==r.inspectorAccountId||r.inspectorRole!=='Profesional'||!r.enabled||!r.verifiedAt||[r.clientAccountId,r.providerAccountId].includes(a.accountId))fail(403,'Solo el inspector seleccionado puede adjuntar antecedentes')
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('inspection:'||$1::text,0))",[r.caseId])
    await attachmentAccess(tx,header,body)
    if((await tx.query("SELECT 1 FROM matchter.stage_claim_events WHERE claim_id=$1 AND actor_account_id=$2 AND data->>'side'='mediator' LIMIT 1",[r.caseId,a.accountId])).rows[0])fail(403,'Conflicto de interés')
    const prior=(await tx.query('SELECT '+attachmentFields+' FROM matchter.inspection_attachments WHERE order_id=$1 AND submission_id=$2',[r.id,body.submissionId])).rows[0]
    if(prior){if(prior.sha256!==file.sha256||prior.filename!==file.filename||prior.mediaType!==file.mediaType)fail(409,'Identificador ya utilizado')}
    else{
     const count=(await tx.query('SELECT count(*)::int AS n FROM matchter.inspection_attachments WHERE order_id=$1',[r.id])).rows[0].n
     if(count>=10)fail(409,'Límite de 10 archivos de prueba por inspección')
     await tx.query('INSERT INTO matchter.inspection_attachments(order_id,uploader_profile_id,submission_id,filename,media_type,bytes,sha256) VALUES($1,$2,$3,$4,$5,$6,$7)',[r.id,a.profileId,body.submissionId,file.filename,file.mediaType,file.bytes,file.sha256])
    }
    const files=(await tx.query('SELECT '+attachmentFields+' FROM matchter.inspection_attachments WHERE order_id=$1 ORDER BY created_at,id',[r.id])).rows
    await tx.query('COMMIT');return {files}
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  },
  async caseView(header,query){
   const a=await getActor(db,header,query.role),c=await caseFor(db,query.claimId,a)
   const award=(await db.query('SELECT order_id AS id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[c.id])).rows[0]
   const rows=(await db.query('SELECT '+rowFields+joins+' WHERE o.claim_id=$1 AND (o.requester_profile_id=$2 OR o.id=$3) ORDER BY o.created_at DESC LIMIT 100',[c.id,a.profileId,award?.id??null])).rows
   const orders=[];for(const r of rows)orders.push({...view(r,await eventsFor(db,r.id),a),awarded:award?.id===r.id,caseAwarded:!!award})
   return {orders,canSelect:c.requested&&!award,inspectors:c.requested&&!award?await directory(db,c):[]}
  },
  async select(header,body){
   shape(body,['role','claimId','inspectorProfileId','scope'])
   id(body.inspectorProfileId)
   if(typeof body.scope!=='string'||body.scope.trim().length<20||body.scope.length>4000)fail(400,'Describe el alcance de la inspección (20 a 4000 caracteres)')
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await getActor(tx,header,body.role)
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('inspection:'||$1::text,0))",[id(body.claimId)])
    const c=await caseFor(tx,body.claimId,a)
    if(!c.requested)fail(409,'Primero registra tu solicitud de inspección')
    const previous=(await tx.query('SELECT '+rowFields+joins+' WHERE o.claim_id=$1 AND o.requester_profile_id=$2 AND o.inspector_profile_id=$3',[c.id,a.profileId,body.inspectorProfileId])).rows[0]
    if(previous){
     if((await eventsFor(tx,previous.id)).some(e=>e.action==='cancel'))fail(409,'Esta inspección fue cancelada; elige otro profesional')
     // Reopening a conversation must not create a duplicate or replace its original scope.
     const award=(await tx.query('SELECT order_id AS id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[c.id])).rows[0]
     const result={...view(previous,await eventsFor(tx,previous.id),a),awarded:award?.id===previous.id,caseAwarded:!!award};await tx.query('COMMIT');return {order:result}
    }
    if((await tx.query('SELECT 1 FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[c.id])).rows[0])fail(409,'Ya se contrató una inspección para el expediente')
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
   const orders=[];for(const r of rows){const award=(await db.query('SELECT order_id AS id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[r.caseId])).rows[0];orders.push({...view(r,await eventsFor(db,r.id),a),awarded:award?.id===r.id,caseAwarded:!!award})}
   return {enabled:true,orders}
  },
  async conversation(header,query){
   const a=await getActor(db,header,query.role),r=await orderRow(db,query.orderId,a)
   if(![r.requesterProfileId,r.inspectorProfileId].includes(a.profileId))fail(404,'Conversación no disponible')
   const award=(await db.query('SELECT order_id AS id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[r.caseId])).rows[0]
   return {order:{...view(r,await eventsFor(db,r.id),a),awarded:award?.id===r.id,caseAwarded:!!award}}
  },
  async change(header,body){
   shape(body,['role','orderId','submissionId','action','input']);id(body.submissionId)
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await getActor(tx,header,body.role),initial=await orderRow(tx,body.orderId,a)
    // Serialize every award across all conversations in the same case.
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('inspection:'||$1::text,0))",[initial.caseId])
    const r=await orderRow(tx,body.orderId,a)
    if(![r.requesterProfileId,r.inspectorProfileId].includes(a.profileId))fail(403,'Acción no autorizada')
    const award=(await tx.query('SELECT order_id AS id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[r.caseId])).rows[0]
    const fingerprint=JSON.stringify([body.action,body.input])
    const prior=(await tx.query('SELECT data FROM matchter.inspection_order_events WHERE order_id=$1 AND actor_profile_id=$2 AND submission_id=$3',[r.id,a.profileId,body.submissionId])).rows[0]
    if(prior){if(prior.data.fingerprint!==fingerprint)fail(409,'Identificador ya utilizado')}
    else{
     if((await eventsFor(tx,r.id)).some(e=>e.action==='cancel'))fail(409,'Inspección cancelada')
     if(award&&award.id!==r.id)fail(409,'Se eligió otro inspector para este expediente')
     const conflicted=(await tx.query("SELECT 1 FROM matchter.stage_claim_events WHERE claim_id=$1 AND actor_account_id=$2 AND data->>'side'='mediator' LIMIT 1",[r.caseId,r.inspectorAccountId])).rows[0]
     const order={...r,partyAccountIds:[r.clientAccountId,r.providerAccountId],inspector:{accountId:r.inspectorAccountId,profileId:r.inspectorProfileId,verified:!!r.verifiedAt,eligible:r.enabled===true&&r.inspectorRole==='Profesional'&&!conflicted&&![r.clientAccountId,r.providerAccountId].includes(r.inspectorAccountId)}}
     let event
     if(body.action==='cancel'){
      if(award?.id!==r.id||inspectionState(await eventsFor(tx,r.id)).report)fail(409,'No se puede cancelar una inspección con informe o sin selección activa')
      shape(body.input,['reason'])
      if(typeof body.input.reason!=='string'||body.input.reason.trim().length<5||body.input.reason.length>1000)fail(400,'Indica el motivo de cancelación')
      if((await tx.query('SELECT 1 FROM matchter.inspection_attachments WHERE order_id=$1 LIMIT 1',[r.id])).rows[0])fail(409,'Ya existen evidencias de inspección. Solicita revisión administrativa.')
      await tx.query('UPDATE matchter.inspection_awards SET cancelled_at=now(),cancelled_by=$2,cancellation_reason=$3 WHERE order_id=$1 AND cancelled_at IS NULL',[r.id,a.profileId,body.input.reason.trim()])
      event={action:'cancel',reason:body.input.reason.trim(),author:a.profileId===r.inspectorProfileId?'inspector':'requester'}
     }else try{event=nextInspectionEvent({order,events:await eventsFor(tx,r.id),actor:a,action:body.action,input:body.input,now:clock()})}catch(e){if([400,403,409].includes(e.status))fail(e.status,e.message);throw e}
     if(event.action==='report'&&award?.id!==r.id)fail(403,'Solo el inspector seleccionado puede presentar el informe')
     if(event.action==='accept')await tx.query('INSERT INTO matchter.inspection_awards(claim_id,order_id) VALUES($1,$2)',[r.caseId,r.id])
     await tx.query('INSERT INTO matchter.inspection_order_events(order_id,actor_profile_id,submission_id,data) VALUES($1,$2,$3,$4)',[r.id,a.profileId,body.submissionId,JSON.stringify({...event,fingerprint})])
    }
    const active=(await tx.query('SELECT order_id AS id FROM matchter.inspection_awards WHERE claim_id=$1 AND cancelled_at IS NULL',[r.caseId])).rows[0];const result={...view(r,await eventsFor(tx,r.id),a),awarded:active?.id===r.id,caseAwarded:!!active};await tx.query('COMMIT');return {order:result}
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  }
 })
}
