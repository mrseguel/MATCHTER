import {AuthError} from './identityAccounts.js'
import {contractContext} from './projectContractDemo.js'
import {readStageDemo} from './projectStageDemo.js'
import {prepareStageClaim,validateStageClaim} from './stageClaimIntake.js'
const columns='id,request_id AS "requestId",reporter_profile_id AS "reporterId",data,created_at AS "createdAt"'
const view=(row,actor)=>({id:row.id,requestId:row.requestId,createdAt:row.createdAt,submittedByMe:row.reporterId===actor.id,...Object.fromEntries(Object.entries(row.data).filter(([key])=>!['submissionId','createdAt','requestId'].includes(key)))})
const guard=fn=>{try{return fn()}catch(e){if([400,403,409].includes(e.status))throw new AuthError(e.status,e.message);throw e}}
export async function listStageClaims(db,actor,id){
 const match=(await db.query("SELECT id FROM matchter.swipe_requests WHERE id=$1 AND status='accepted' AND (sender_profile_id=$2 OR recipient_profile_id=$2)",[id,actor.id])).rows[0]
 if(!match)throw new AuthError(404,'Proyecto no disponible')
 const rows=(await db.query('SELECT '+columns+' FROM matchter.stage_claims WHERE request_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[id])).rows
 return {claims:rows.map(r=>view(r,actor))}
}
export async function submitStageClaim(db,actor,id,input){
 const clean=guard(()=>validateStageClaim(input))
 if(clean.requestId!==id)throw new AuthError(400,'Proyecto no válido')
 const tx=await db.connect()
 try{
  await tx.query('BEGIN')
  const {side,agreement,current}=await contractContext(tx,actor,id,true)
  const existing=(await tx.query('SELECT '+columns+' FROM matchter.stage_claims WHERE reporter_profile_id=$1 AND submission_id=$2',[actor.id,clean.submissionId])).rows[0]
  if(existing){
   if(existing.requestId!==id||Object.entries(clean).some(([k,v])=>existing.data[k]!==v))throw new AuthError(409,'Identificador de envío ya utilizado')
   await tx.query('COMMIT');return {claim:view(existing,actor)}
  }
  const tracking=await readStageDemo(tx,actor,id)
  const claim=guard(()=>prepareStageClaim({input,agreement,contract:current,tracking,side}))
  const row=(await tx.query('INSERT INTO matchter.stage_claims(request_id,agreement_version,contract_revision,reporter_profile_id,submission_id,stage_no,data) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(reporter_profile_id,submission_id) DO NOTHING RETURNING '+columns,[id,clean.agreementVersion,clean.contractRevision,actor.id,clean.submissionId,clean.stageNo,JSON.stringify(claim)])).rows[0]
  if(!row)throw new AuthError(409,'El envío ya existe. Actualiza tus reclamos.')
  await tx.query('COMMIT');return {claim:view(row,actor)}
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
