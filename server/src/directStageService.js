import {AuthError} from './identityAccounts.js'
import {directStageState,nextDirectStageEvent,DIRECT_STAGE_ACTIONS} from './directStageTracking.js'
const fail=(status,message)=>{throw new AuthError(status,message)}
export const isDirectContract=c=>c?.terms?.paymentMode==='direct'
const cols='stage_no AS "stageNo",action,progress_percent::float8 AS "progressPercent",recorded_at AS "at"'
const scope=(id,a,c)=>[id,a.version,c.revision]
export function validateDirectStageAction(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['role','requestId','action','agreementVersion','contractRevision','digest','stageNo','accepted','progressPercent'].includes(k))||!DIRECT_STAGE_ACTIONS.includes(b.action)||!Number.isSafeInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isSafeInteger(b.contractRevision)||b.contractRevision<1||!Number.isSafeInteger(b.stageNo)||b.stageNo<1||b.stageNo>50||typeof b.digest!=='string'||!/^[a-f0-9]{64}$/.test(b.digest)||b.accepted!==true)fail(400,'Acción de seguimiento no válida')
}
export async function readDirectStageEvents(db,id,a,c){
 if(!isDirectContract(c))fail(409,'Modalidad de seguimiento no válida')
 return (await db.query('SELECT '+cols+' FROM matchter.project_direct_stage_events WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3 ORDER BY event_id',scope(id,a,c))).rows
}
export function directStageView(a,c,events){
 return {demo:true,agreementVersion:a.version,contractRevision:c.revision,digest:c.digest,...directStageState(a,events)}
}
// The caller must use contractContext with the participant and lock, check stageReady,
// and commit or roll back the transaction. Never writes to the protected-payment table.
export async function recordDirectStage(tx,actor,id,a,c,side,b){
 if(!isDirectContract(c))fail(409,'Modalidad de seguimiento no válida')
 validateDirectStageAction(b)
 if(b.agreementVersion!==a.version||b.contractRevision!==c.revision||b.digest!==c.digest)fail(409,'El contrato no coincide')
 const events=await readDirectStageEvents(tx,id,a,c)
 let event
 try{event=nextDirectStageEvent({agreement:a,events,side,action:b.action,stageNo:b.stageNo,progressPercent:b.progressPercent})}
 catch(e){if([400,403,409].includes(e.status))fail(e.status,e.message);throw e}
 if(event){
  const saved=(await tx.query('INSERT INTO matchter.project_direct_stage_events(request_id,agreement_version,contract_revision,stage_no,action,actor_profile_id,progress_percent) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING '+cols,[...scope(id,a,c),event.stageNo,event.action,actor.id,event.progressPercent??null])).rows[0]
  if(!saved)fail(409,'No se pudo registrar el avance')
  events.push(saved)
 }
 return directStageView(a,c,events)
}
