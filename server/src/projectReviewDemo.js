import {AuthError} from './identityAccounts.js'
import {contractContext} from './projectContractDemo.js'
import {stageReady} from './projectStageDemo.js'
const fail=(status,message)=>{throw new AuthError(status,message)}
const cols='score,comment,created_at AS "createdAt"'
export function validateReview(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['role','requestId','agreementVersion','contractRevision','digest','score','comment'].includes(k))||!Number.isInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isInteger(b.contractRevision)||b.contractRevision<1||typeof b.digest!=='string'||!(/^[a-f0-9]{64}$/).test(b.digest)||!Number.isInteger(b.score)||b.score<1||b.score>5||typeof b.comment!=='string'||b.comment.length>1500)fail(400,'Calificación no válida')
}
async function context(db,actor,id,lock=false){
 const {side,agreement,current}=await contractContext(db,actor,id,lock)
 if(!stageReady(current))fail(409,'Primero formaliza el contrato')
 const count=agreement.data.stages.length
 const rows=(await db.query('SELECT stage_no AS "stageNo", released_at AS "releasedAt" FROM matchter.project_stage_demos WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3',[id,agreement.version,current.revision])).rows
 if(!count||!agreement.data.stages.every((_,i)=>rows.some(r=>r.stageNo===i+1&&r.releasedAt)))fail(409,'Primero completa todas las etapas y libera los pagos de prueba')
 return {side,agreement,current}
}
async function existing(db,id,a,c){return (await db.query('SELECT '+cols+' FROM matchter.project_review_demos WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3',[id,a.version,c.revision])).rows[0]||null}
export async function readReviewDemo(db,actor,id){
 const {agreement,current}=await context(db,actor,id)
 return {demo:true,review:await existing(db,id,agreement,current)}
}
export async function changeReviewDemo(db,actor,id,b){
 validateReview(b)
 const tx=await db.connect()
 try{
  await tx.query('BEGIN')
  const {side,agreement,current}=await context(tx,actor,id,true)
  if(side!=='client')fail(403,'Solo el cliente puede calificar este proyecto')
  if(b.agreementVersion!==agreement.version||b.contractRevision!==current.revision||b.digest!==current.digest)fail(409,'El contrato cambió. Actualiza antes de calificar.')
  let review=await existing(tx,id,agreement,current)
  const comment=b.comment.trim()
  if(review){if(review.score!==b.score||review.comment!==comment)fail(409,'La calificación de este proyecto ya está registrada')}
  else review=(await tx.query('INSERT INTO matchter.project_review_demos(request_id,agreement_version,contract_revision,score,comment) VALUES($1,$2,$3,$4,$5) RETURNING '+cols,[id,agreement.version,current.revision,b.score,comment])).rows[0]
  if(!review)fail(409,'No se pudo guardar la calificación')
  await tx.query('COMMIT')
  return {demo:true,review}
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
