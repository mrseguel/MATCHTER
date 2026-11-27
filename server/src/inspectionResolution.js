// Direct-mode post-inspection record: no financial operations or compulsory settlement.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})}
export const isInspectionResolutionAction=action=>['inspection_observation','inspection_propose','inspection_accept','inspection_decline','inspection_close'].includes(action)
export function inspectionResolutionState(events=[],reportId){
 if(!reportId)return null
 const s={reportId,status:'review',proposal:null,accepted:[],rejected:[],observations:[]}
 for(const e of events.filter(e=>e.reportId===reportId)){
  if(e.action==='inspection_observation')s.observations.push({id:e.id,side:e.side,text:e.text})
  if(e.action==='inspection_propose'){s.proposal={id:e.id,text:e.text};s.accepted=[];s.rejected=[];s.status='proposed'}
  if(e.action==='inspection_accept')s.accepted.push(e.side)
  if(e.action==='inspection_decline')s.rejected.push(e.side)
  if(s.proposal&&new Set([...s.accepted,...s.rejected]).size===2)s.status=s.rejected.length?'closed_without_agreement':'closed_with_agreement'
  if(e.action==='inspection_close')s.status='closed_without_agreement'
 }
 return s
}
export function checkInspectionResolutionAction({events=[],reportId,side,action,text,reference,mode,mediationStatus}){
 if(!reportId||mode!=='direct'||mediationStatus!=='closed_without_agreement')fail(409,'Se requiere el informe técnico del inspector seleccionado')
 const part=['client','provider'].includes(side),mediator=side==='mediator'
 if(!part&&!mediator)fail(403,'Acceso no autorizado')
 const s=inspectionResolutionState(events,reportId)
 if(s.status.startsWith('closed'))fail(409,'Revisión técnica cerrada')
 const withText=['inspection_observation','inspection_propose','inspection_close'].includes(action)
 if(withText?(typeof text!=='string'||text.trim().length<5||text.length>4000):text!==undefined)fail(400,'Antecedentes no válidos')
 if(action==='inspection_observation'){
  if(!part||reference!==reportId)fail(409,'Observación no disponible')
 }else if(action==='inspection_propose'||action==='inspection_close'){
  if(!mediator||reference!==reportId)fail(409,'Actuación no disponible')
 }else if(action==='inspection_accept'||action==='inspection_decline'){
  if(!part||s.status!=='proposed'||reference!==s.proposal?.id||s.accepted.includes(side)||s.rejected.includes(side))fail(409,'Propuesta no disponible')
 }else fail(400,'Acción no válida')
 return {action,side,reportId,reference,...(withText?{text:text.trim()}:{})}
}
