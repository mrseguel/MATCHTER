import {listClaimEvidence,readClaimEvidence,appendClaimEvidence} from './claimEvidence.js'
import {inspectionResolutionState,isInspectionResolutionAction,checkInspectionResolutionAction} from './inspectionResolution.js'
import {inspectionCaseRecord} from './inspectionService.js'
import {signedDisputeReminder} from './signedDisputeReminder.js'
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
 WHERE c.id=$1 AND (($3::boolean AND NOT EXISTS (SELECT 1 FROM matchter.account_profiles p WHERE p.account_id=$4 AND p.id IN (r.sender_profile_id,r.recipient_profile_id))) OR (NOT $3::boolean AND (r.sender_profile_id=$2 OR r.recipient_profile_id=$2)))`+(lock?' FOR UPDATE OF c':''),[claimId,actor.profileId??null,actor.mediator===true,actor.accountId])).rows[0]
 if(!c)fail(404,'Expediente no disponible')
 const side=actor.mediator?'mediator':c.senderId===actor.profileId?'client':'provider'
 return {c,side}
}
async function detail(q,claimId,actor,inspectionsEnabled=false){
 const {c,side}=await context(q,claimId,actor)
 const events=await eventsFor(q,claimId)
 const {submissionId,...claim}=c.data
 const signed=(await q.query('SELECT revision,agreement_version AS "agreementVersion",terms,digest,client_signed_at AS "clientSignedAt",provider_signed_at AS "providerSignedAt" FROM matchter.project_contract_demos WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND digest=$4',[c.requestId,claim.agreementVersion,claim.contractRevision,claim.digest])).rows[0]
 const contractReminder=signedDisputeReminder(claim,signed)
 const inspection=inspectionsEnabled?await inspectionCaseRecord(q,c.id):null
 const reportId=inspection?.events.find(e=>e.action==='report')?.id
 const inspectionResolution=claim.mode==='direct'?inspectionResolutionState(events,reportId):null
 return {id:c.id,requestId:c.requestId,claim,createdAt:c.createdAt,side,contractReminder,inspection,inspectionResolution,...mediationState(events)}
}
export function createMediationService({db,verifyIdentity,inspectionsEnabled=false,evidenceEnabled=false}){
 async function actor(header,role,mediator,q=db){
  const identity=await verifyIdentity(header)
  const query=mediator?'SELECT a.id AS "accountId" FROM matchter.accounts a JOIN matchter.mediation_administrators m ON m.account_id=a.id WHERE a.auth_issuer=$1 AND a.auth_subject=$2':'SELECT a.id AS "accountId",p.id AS "profileId",p.role FROM matchter.accounts a JOIN matchter.account_active_profiles s ON s.account_id=a.id JOIN matchter.account_profiles p ON p.account_id=a.id AND p.role=s.role WHERE a.auth_issuer=$1 AND a.auth_subject=$2'
  const row=(await q.query(query,[identity.issuer,identity.subject])).rows[0]
  if(!row||(!mediator&&row.role!==role))fail(403,'Acceso no autorizado')
  return {...row,mediator}
 }
 return Object.freeze({
  async access(header){await actor(header,null,true);return {authorized:true}},
  async queue(header){const a=await actor(header,null,true);const rows=(await db.query('SELECT c.id,c.request_id AS "requestId",c.data,c.created_at AS "createdAt" FROM matchter.stage_claims c JOIN matchter.swipe_requests r ON r.id=c.request_id WHERE NOT EXISTS (SELECT 1 FROM matchter.account_profiles p WHERE p.account_id=$1 AND p.id IN (r.sender_profile_id,r.recipient_profile_id)) ORDER BY c.created_at DESC,c.id DESC LIMIT 100',[a.accountId])).rows;return {cases:rows.map(r=>({id:r.id,requestId:r.requestId,createdAt:r.createdAt,projectTitle:r.data.projectTitle,stageNo:r.data.stageNo}))}},
  async get(header,query,mediator=false){return detail(db,query.claimId,await actor(header,query.role,mediator),inspectionsEnabled)},
  async evidence(header,query,mediator=false){
   if(!evidenceEnabled)fail(404,'Evidencias no disponibles')
   await context(db,query.claimId,await actor(header,query.role,mediator))
   return {files:await listClaimEvidence(db,query.claimId)}
  },
  async evidenceFile(header,query,mediator=false){
   if(!evidenceEnabled)fail(404,'Evidencias no disponibles')
   await context(db,query.claimId,await actor(header,query.role,mediator))
   return readClaimEvidence(db,query.claimId,query.fileId)
  },
  async addEvidence(header,body){
   if(!evidenceEnabled)fail(404,'Evidencias no disponibles')
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await actor(header,body?.role,false,tx)
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('mediation:'||$1::text,0))",[body?.claimId])
    const {c}=await context(tx,body?.claimId,a)
    const events=await eventsFor(tx,c.id),state=mediationState(events)
    const inspection=inspectionsEnabled?await inspectionCaseRecord(tx,c.id):null
    const final=inspectionResolutionState(events,inspection?.events.find(e=>e.action==='report')?.id)
    if(state.status==='closed_with_agreement'||final?.status.startsWith('closed'))fail(409,'El expediente está cerrado; conserva los nuevos antecedentes por separado')
    const result=await appendClaimEvidence(tx,c.id,a.profileId,body)
    await tx.query('COMMIT');return result
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  },
  async exportCase(header,query,mediator=false){
   const a=await actor(header,query.role,mediator)
   const record=await detail(db,query.claimId,a,inspectionsEnabled),c=record.claim
   const signed=(await db.query('SELECT revision,agreement_version AS "agreementVersion",mode,terms,digest,created_at AS "createdAt",client_signed_at AS "clientSignedAt",provider_signed_at AS "providerSignedAt" FROM matchter.project_contract_demos WHERE request_id=$1 AND agreement_version=$2 AND revision=$3 AND digest=$4',[record.requestId,c.agreementVersion,c.contractRevision,c.digest])).rows[0]
   const agreement=(await db.query('SELECT version,data,client_confirmed_at AS "clientConfirmedAt",provider_confirmed_at AS "providerConfirmedAt" FROM matchter.project_agreement_versions WHERE request_id=$1 AND version=$2',[record.requestId,c.agreementVersion])).rows[0]
   if(!signed||!agreement)fail(409,'No se pudo verificar el documento original del expediente')
   const inspection=record.inspection
   const evidence=evidenceEnabled?await listClaimEvidence(db,record.id):[]
   const inspectionFiles=evidenceEnabled&&inspection?(await db.query('SELECT id,filename,media_type AS "mediaType",octet_length(bytes) AS size,sha256,created_at AS "createdAt" FROM matchter.inspection_attachments WHERE order_id=$1 ORDER BY created_at,id',[inspection.id])).rows:[]
   const cancellations=evidenceEnabled?(await db.query('SELECT a.order_id AS "orderId",a.cancelled_at AS "cancelledAt",a.cancellation_reason AS reason,i.display_name AS "inspectorName" FROM matchter.inspection_awards a JOIN matchter.inspection_orders o ON o.id=a.order_id JOIN matchter.inspector_registry i ON i.profile_id=o.inspector_profile_id WHERE a.claim_id=$1 AND a.cancelled_at IS NOT NULL ORDER BY a.cancelled_at',[record.id])).rows:[]
   return {format:'matchter-mediation-record-v1',exportedAt:new Date().toISOString(),case:record,contract:signed,agreement,inspection,evidence,inspectionFiles,cancellations,limitations:['Firmas de prueba, no certificación legal.','Los reclamos son alegaciones, no hechos comprobados.','No incluye archivos originales de evidencia ni conversaciones ajenas al expediente.']}
  },
  async change(header,body,mediator=false){
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['role','claimId','submissionId','action','text','reference'].includes(k))||!validId(body.claimId)||!validId(body.submissionId)||typeof body.action!=='string')fail(400,'Actuación no válida')
   const tx=await db.connect()
   try{
    await tx.query('BEGIN')
    const a=await actor(header,body.role,mediator,tx)
    await context(tx,body.claimId,a)
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('mediation:'||$1::text,0))",[body.claimId])
    const {side,c}=await context(tx,body.claimId,a)
    const previous=(await tx.query('SELECT data FROM matchter.stage_claim_events WHERE claim_id=$1 AND actor_account_id=$2 AND submission_id=$3',[body.claimId,a.accountId,body.submissionId])).rows[0]
    const fingerprint=JSON.stringify([side,body.action,body.text??null,body.reference??null])
    if(previous){if(previous.data.fingerprint!==fingerprint)fail(409,'Identificador ya utilizado')}
    else{
     const events=await eventsFor(tx,body.claimId)
     let event
     try{
      if(isInspectionResolutionAction(body.action)){
       const inspection=inspectionsEnabled?await inspectionCaseRecord(tx,c.id):null
       if(mediator&&inspection&&(await tx.query('SELECT 1 FROM matchter.account_profiles WHERE id=$1 AND account_id=$2',[inspection.inspector.profileId,a.accountId])).rows[0])fail(403,'El inspector no puede mediar su propio informe')
       event=checkInspectionResolutionAction({events,reportId:inspection?.events.find(e=>e.action==='report')?.id,side,action:body.action,text:body.text,reference:body.reference,mode:c.data.mode,mediationStatus:mediationState(events).status})
      }else event=checkMediationAction({events,side,action:body.action,text:body.text,reference:body.reference,mode:c.data.mode})
     }catch(e){if([400,403,409].includes(e.status))fail(e.status,e.message);throw e}
     await tx.query('INSERT INTO matchter.stage_claim_events(claim_id,actor_account_id,actor_profile_id,submission_id,data) VALUES($1,$2,$3,$4,$5)',[body.claimId,a.accountId,a.profileId??null,body.submissionId,JSON.stringify({...event,fingerprint})])
    }
    const result=await detail(tx,body.claimId,a,inspectionsEnabled)
    await tx.query('COMMIT');return result
   }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
  }
 })
}
