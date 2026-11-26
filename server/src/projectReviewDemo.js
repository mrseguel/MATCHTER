import {AuthError} from './identityAccounts.js'
import {contractContext} from './projectContractDemo.js'
import {stageReady} from './projectStageDemo.js'
const fail=(status,message)=>{throw new AuthError(status,message)}
const cols='score,comment,created_at AS "createdAt"'
export const REVIEW_WINDOW_MS=7*24*60*60*1000
export function reviewView(r,side,now=Date.now()){
 if(!r)return null
 const expiresAt=new Date(new Date(r.createdAt).getTime()+REVIEW_WINDOW_MS).toISOString()
 return {...r,revision:r.revision||1,updatedAt:r.updatedAt||r.createdAt,expiresAt,editable:side==='client'&&now<new Date(expiresAt).getTime()}
}
export function validateReview(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['role','requestId','agreementVersion','contractRevision','digest','score','comment','expectedRevision'].includes(k))||!Number.isInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isInteger(b.contractRevision)||b.contractRevision<1||typeof b.digest!=='string'||!(/^[a-f0-9]{64}$/).test(b.digest)||!Number.isInteger(b.score)||b.score<1||b.score>5||typeof b.comment!=='string'||b.comment.length>1500||(b.expectedRevision!==undefined&&(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0)))fail(400,'Calificación no válida')
}
async function context(db,actor,id,lock=false){
 const {side,agreement,current}=await contractContext(db,actor,id,lock)
 if(!stageReady(current))fail(409,'Primero formaliza el contrato')
 const count=agreement.data.stages.length
 const rows=(await db.query('SELECT stage_no AS "stageNo", released_at AS "releasedAt" FROM matchter.project_stage_demos WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3',[id,agreement.version,current.revision])).rows
 if(!count||!agreement.data.stages.every((_,i)=>rows.some(r=>r.stageNo===i+1&&r.releasedAt)))fail(409,'Primero completa todas las etapas y libera los pagos de prueba')
 return {side,agreement,current}
}
async function existing(db,id,a,c){return (await db.query(`SELECT COALESCE(e.score,v.score) AS score,COALESCE(e.comment,v.comment) AS comment,v.created_at AS "createdAt",COALESCE(e.created_at,v.created_at) AS "updatedAt",COALESCE(e.revision,1) AS revision FROM matchter.project_review_demos v LEFT JOIN LATERAL (SELECT score,comment,created_at,revision FROM matchter.project_review_demo_revisions WHERE request_id=v.request_id AND agreement_version=v.agreement_version AND contract_revision=v.contract_revision ORDER BY revision DESC LIMIT 1) e ON true WHERE v.request_id=$1 AND v.agreement_version=$2 AND v.contract_revision=$3`,[id,a.version,c.revision])).rows[0]||null}
export async function readReviewDemo(db,actor,id){
 const {side,agreement,current}=await context(db,actor,id)
 return {demo:true,review:reviewView(await existing(db,id,agreement,current),side)}
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
  if(review){
   if(review.score!==b.score||review.comment!==comment){
    if(!reviewView(review,side).editable)fail(409,'El plazo de siete días para modificar la calificación terminó')
    if(b.expectedRevision!==review.revision)fail(409,'La calificación cambió. Actualiza antes de modificarla.')
    const edit=(await tx.query(`INSERT INTO matchter.project_review_demo_revisions(request_id,agreement_version,contract_revision,revision,score,comment) SELECT $1,$2,$3,$4,$5,$6 FROM matchter.project_review_demos WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3 AND clock_timestamp()<created_at+interval '168 hours' RETURNING revision,score,comment,created_at AS "updatedAt"`,[id,agreement.version,current.revision,review.revision+1,b.score,comment])).rows[0]
    if(!edit)fail(409,'El plazo de siete días para modificar la calificación terminó')
    review={...review,...edit}
   }
  }
  else {if(b.expectedRevision!==undefined&&b.expectedRevision!==0)fail(409,'La calificación cambió. Actualiza antes de continuar.');review=(await tx.query('INSERT INTO matchter.project_review_demos(request_id,agreement_version,contract_revision,score,comment) VALUES($1,$2,$3,$4,$5) RETURNING '+cols,[id,agreement.version,current.revision,b.score,comment])).rows[0]}
  if(!review)fail(409,'No se pudo guardar la calificación')
  await tx.query('COMMIT')
  return {demo:true,review:reviewView(review,side)}
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
