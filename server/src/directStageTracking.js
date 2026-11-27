// Physical execution only. No payment or custody status is inferred from these events.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})}
export const DIRECT_STAGE_ACTIONS=Object.freeze(['start','progress','deliver','accept'])
const roles={start:'provider',progress:'provider',deliver:'provider',accept:'client'}

export function directStageState(agreement,events=[]){
 const stages=agreement.data.stages.map(([title,date,amount,physicalPercent],i)=>{
  const stageNo=i+1, history=events.filter(e=>e.stageNo===stageNo)
  const startedAt=history.find(e=>e.action==='start')?.at||null
  const deliveredAt=history.find(e=>e.action==='deliver')?.at||null
  const acceptedAt=history.find(e=>e.action==='accept')?.at||null
  const progressPercent=deliveredAt?100:history.filter(e=>e.action==='progress').at(-1)?.progressPercent||0
  return {stageNo,title,date,amount:Number(amount),physicalPercent,startedAt,deliveredAt,acceptedAt,progressPercent,history,
   status:acceptedAt?'accepted':deliveredAt?'delivered':startedAt?'in_progress':'pending'}
 })
 const currentStage=stages.find(s=>!s.acceptedAt)?.stageNo||null
 return {paymentMode:'direct',financialCustody:false,stages,currentStage,complete:currentStage===null}
}

// Returns a new event, or null for a harmless retry; caller persists atomically
// under the contract lock after checking participant and exact signed contract digest.
export function nextDirectStageEvent({agreement,events=[],side,action,stageNo,progressPercent,now=new Date()}){
 if(!DIRECT_STAGE_ACTIONS.includes(action)||!Number.isSafeInteger(stageNo)||stageNo<1)fail(400,'Acción de seguimiento no válida')
 if(roles[action]!==side)fail(403,'Acción reservada al perfil correspondiente')
 if(action==='progress'&&(!Number.isFinite(progressPercent)||progressPercent<0||progressPercent>100||Math.abs(progressPercent*100-Math.round(progressPercent*100))>1e-7))fail(400,'Porcentaje de avance no válido')
 if(action!=='progress'&&progressPercent!==undefined)fail(400,'Porcentaje no corresponde a esta acción')
 const state=directStageState(agreement,events),s=state.stages[stageNo-1]
 if(!s)fail(400,'La etapa no existe en el contrato')
 if(action!=='progress'&&s.history.some(e=>e.action===action))return null
 if(state.currentStage!==stageNo)fail(409,'Primero completa la etapa anterior')
 if(action!=='start'&&!s.startedAt)fail(409,'Primero registra el inicio de los trabajos')
 if(action==='progress'){
  if(s.deliveredAt)fail(409,'La etapa ya fue entregada')
  if(progressPercent===s.progressPercent)return null
  if(progressPercent<s.progressPercent)fail(409,'El avance registrado no puede retroceder')
 }
 if(action==='accept'&&!s.deliveredAt)fail(409,'Primero registra la entrega de los trabajos')
 return {stageNo,action,side,at:new Date(now).toISOString(),...(action==='progress'?{progressPercent}:{} )}
}
