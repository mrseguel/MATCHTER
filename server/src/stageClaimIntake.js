// Stage-linked case intake. No financial side effects and no adjudication.
export const CLAIM_REASONS=Object.freeze(['quality_scope','delay','nonperformance','payment_disagreement','communication','other'])
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const digest=/^[a-f0-9]{64}$/
const positive=n=>Number.isSafeInteger(n)&&n>0
export function validateStageClaim(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['role','requestId','submissionId','agreementVersion','contractRevision','digest','stageNo','reason','description','requestedResolution','contractReference'].includes(k)))fail(400,'Datos del reclamo no válidos')
 if(!uuid.test(input.requestId||'')||!uuid.test(input.submissionId||'')||!positive(input.agreementVersion)||!positive(input.contractRevision)||!digest.test(input.digest||'')||!positive(input.stageNo)||input.stageNo>50||!CLAIM_REASONS.includes(input.reason))fail(400,'Selecciona el contrato, etapa y motivo del reclamo')
 const bounded=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max
 if(!bounded(input.description,20,4000)||!bounded(input.requestedResolution,5,1500)||!bounded(input.contractReference??'',0,1000))fail(400,'Describe lo ocurrido y la solución solicitada')
 return {requestId:input.requestId,submissionId:input.submissionId,agreementVersion:input.agreementVersion,contractRevision:input.contractRevision,digest:input.digest,stageNo:input.stageNo,reason:input.reason,description:input.description.trim(),requestedResolution:input.requestedResolution.trim(),contractReference:(input.contractReference??'').trim()}
}
// Call with contract/identity/stages read by an authenticated server under lock.
// Never pass client-supplied objects as these trusted arguments.
export function prepareStageClaim({input,agreement,contract,tracking,side,now=new Date()}){
 const d=validateStageClaim(input)
 if(!['client','provider'].includes(side))fail(403,'No eres parte del contrato')
 if(!contract?.clientSignedAt||!contract?.providerSignedAt||agreement?.version!==d.agreementVersion||contract.revision!==d.contractRevision||contract.digest!==d.digest)fail(409,'El contrato cambió o aún no está firmado')
 if(!tracking||tracking.agreementVersion!==d.agreementVersion||tracking.contractRevision!==d.contractRevision||tracking.digest!==d.digest)fail(409,'El seguimiento no corresponde al contrato')
 if(tracking.complete)fail(409,'El proyecto está cerrado; consulta el procedimiento de garantías')
 const stage=tracking.stages?.find(s=>s.stageNo===d.stageNo)
 if(!stage||!agreement.data.stages[d.stageNo-1])fail(400,'La etapa no pertenece al contrato')
 const [title,date,amount,physicalPercent]=agreement.data.stages[d.stageNo-1]
 const direct=contract.terms?.paymentMode==='direct'
 const stageSnapshot={stageNo:d.stageNo,title,date,amount:Number(amount),physicalPercent:physicalPercent??null,startedAt:direct?stage.startedAt??null:null,deliveredAt:stage.deliveredAt??null,acceptedAt:direct?stage.acceptedAt??null:null,progressPercent:direct?stage.progressPercent??0:null,status:direct?stage.status:'legacy_demo'}
 return {...d,side,projectTitle:agreement.data.title,stageSnapshot,currentStage:tracking.currentStage,mode:direct?'direct':'legacy_demo',status:'received',createdAt:new Date(now).toISOString()}
}
