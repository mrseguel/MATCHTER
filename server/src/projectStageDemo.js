import {AuthError} from './identityAccounts.js'
import {contractContext,DEMO_NOTARY_FEE} from './projectContractDemo.js'
const cols='stage_no AS "stageNo",amount,funded_at AS "fundedAt",delivered_at AS "deliveredAt",released_at AS "releasedAt"'
const fail=(status,msg)=>{throw new AuthError(status,msg)}
export function stageReady(c){return !!(c?.clientSignedAt&&c?.providerSignedAt&&(c.mode==='simple'||c.mode==='notary'&&c.notaryAcceptedAt&&c.notaryDemoPaidAt&&c.notaryDemoFee===DEMO_NOTARY_FEE&&c.notaryDemoAuthorizedAt))}
export function validateStageAction(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['role','requestId','action','agreementVersion','contractRevision','digest','stageNo','accepted'].includes(k))||!['fund','deliver','release'].includes(b.action)||!Number.isSafeInteger(b.agreementVersion)||b.agreementVersion<1||!Number.isSafeInteger(b.contractRevision)||b.contractRevision<1||!Number.isInteger(b.stageNo)||b.stageNo<1||b.stageNo>50||typeof b.digest!=='string'||!/^[a-f0-9]{64}$/.test(b.digest)||b.accepted!==true)fail(400,'Acción de pago protegido de prueba no válida')
}
async function rowsFor(db,id,a,c){return (await db.query('SELECT '+cols+' FROM matchter.project_stage_demos WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3 ORDER BY stage_no',[id,a.version,c.revision])).rows}
function state(a,c,rows){
 const stages=a.data.stages.map(([title,date,amount,physicalPercent],i)=>{const row=rows.find(r=>r.stageNo===i+1);return {stageNo:i+1,title,date,amount:Number(amount),...(physicalPercent==null?{}:{physicalPercent}),fundedAt:row?.fundedAt||null,deliveredAt:row?.deliveredAt||null,releasedAt:row?.releasedAt||null}})
 const currentStage=stages.find(s=>!s.releasedAt)?.stageNo||null
 return {demo:true,agreementVersion:a.version,contractRevision:c.revision,digest:c.digest,stages,currentStage,complete:currentStage===null}
}
async function readyContext(db,actor,id,lock){const {side,agreement,current}=await contractContext(db,actor,id,lock);if(!stageReady(current))fail(409,'Primero formaliza el contrato de prueba');return {side,agreement,current}}
export async function readStageDemo(db,actor,id){const {agreement,current}=await readyContext(db,actor,id,false);return state(agreement,current,await rowsFor(db,id,agreement,current))}
export async function changeStageDemo(db,actor,id,b){
 validateStageAction(b);const tx=await db.connect()
 try{
  await tx.query('BEGIN')
  const {side,agreement,current}=await readyContext(tx,actor,id,true)
  if(b.agreementVersion!==agreement.version||b.contractRevision!==current.revision||b.digest!==current.digest)fail(409,'El contrato no coincide')
  if(side!==(b.action==='deliver'?'provider':'client'))fail(403,'Acción reservada al perfil correspondiente')
  const rows=await rowsFor(tx,id,agreement,current),before=state(agreement,current,rows),s=before.stages[b.stageNo-1]
  if(!s)fail(400,'La etapa no existe en el contrato')
  const done=b.action==='fund'?s.fundedAt:b.action==='deliver'?s.deliveredAt:s.releasedAt
  if(!done){
   if(before.currentStage!==b.stageNo)fail(409,'Primero completa el hito anterior')
   const args=[id,agreement.version,current.revision,b.stageNo]
   let saved
   if(b.action==='fund')saved=(await tx.query('INSERT INTO matchter.project_stage_demos(request_id,agreement_version,contract_revision,stage_no,amount) VALUES($1,$2,$3,$4,$5) RETURNING '+cols,[...args,s.amount])).rows[0]
   else if(b.action==='deliver'){if(!s.fundedAt)fail(409,'Primero registra el depósito simulado');saved=(await tx.query('UPDATE matchter.project_stage_demos SET delivered_at=now() WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3 AND stage_no=$4 AND delivered_at IS NULL RETURNING '+cols,args)).rows[0]}
   else{if(!s.fundedAt||!s.deliveredAt)fail(409,'Primero registra la entrega de la etapa');saved=(await tx.query('UPDATE matchter.project_stage_demos SET released_at=now() WHERE request_id=$1 AND agreement_version=$2 AND contract_revision=$3 AND stage_no=$4 AND released_at IS NULL RETURNING '+cols,args)).rows[0]}
   if(!saved)fail(409,'No se pudo registrar la acción')
   const idx=rows.findIndex(r=>r.stageNo===b.stageNo);if(idx<0)rows.push(saved);else rows[idx]=saved
  }
  await tx.query('COMMIT');return state(agreement,current,rows)
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
