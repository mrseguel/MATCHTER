// Proposed policy; days are calendar days, start only on recorded receipt by counterparty.
export const DAY=86400000
const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const sides=['client','provider']
const text=v=>typeof v==='string'?v.trim():''
export function formalState(events,now=Date.now()){
 const start=events.find(e=>e.action==='open'),receipt=events.find(e=>e.action==='acknowledge')
 const reporter=start?.side,counterparty=reporter==='client'?'provider':'client'
 const deadline=receipt?Date.parse(receipt.recordedAt)+5*DAY:null
 const responded=events.some(e=>e.side===counterparty&&['respond','propose','accept','decline'].includes(e.action))
 const proposal=events.filter(e=>e.action==='propose').at(-1)||null
 const accepted=proposal?[proposal.side,...events.filter(e=>e.action==='accept'&&e.reference===proposal.id).map(e=>e.side)]:[]
 const declined=!!proposal&&events.some(e=>e.action==='decline'&&e.reference===proposal.id)
 const closed=accepted.includes('client')&&accepted.includes('provider')
 const elapsed=receipt?Math.max(0,now-Date.parse(receipt.recordedAt)):0
 const overdue=!!receipt&&!responded&&!closed&&now>=deadline
 const reminders=!responded&&!closed&&receipt?[...(elapsed>=2*DAY?[48]:[]),...(elapsed>=3*DAY?[72]:[])]:[]
 return {status:!start?'not_open':closed?'closed_with_agreement':overdue?'response_overdue':responded?'in_dialogue':receipt?'awaiting_response':'awaiting_receipt',reporter,counterparty,deadline:deadline===null?null:new Date(deadline).toISOString(),responded,proposal,accepted,declined,closed,overdue,reminderHoursDue:reminders,administrativeReviewSuggested:overdue,events}
}
export function nextFormalEvent({events,side,reporter,action,message,reference,now=Date.now()}){
 if(!sides.includes(side)||!sides.includes(reporter))fail(403,'Perfil no autorizado')
 const state=formalState(events,now),t=text(message)
 if(state.closed)fail(409,'Reclamo finalizado')
 if(action==='open'){if(state.status!=='not_open'||side!==reporter)fail(409,'No se puede iniciar el reclamo formal')}
 else {
 if(state.status==='not_open')fail(409,'Reclamo formal no iniciado')
 if(action==='acknowledge'){if(side!==state.counterparty||state.deadline)fail(409,'Recepción no válida')}
 else if(action==='respond'){if(t.length<5||t.length>4000)fail(400,'Escribe una respuesta de 5 a 4000 caracteres')}
 else if(action==='propose'){if(t.length<5||t.length>1500)fail(400,'Describe la solución de 5 a 1500 caracteres');if(state.proposal&&!state.declined)fail(409,'Responde primero a la propuesta vigente')}
 else if(['accept','decline'].includes(action)){if(!state.proposal||state.declined||side===state.proposal.side||reference!==state.proposal.id||state.accepted.includes(side))fail(409,'Propuesta no disponible')}
 else fail(400,'Acción no válida')
 // A substantive response implies receipt; service records explicit acknowledgement first.
 if(side===state.counterparty&&action!=='acknowledge'&&!state.deadline)fail(409,'Confirma primero la recepción')
 }
 return {action,side,...(['respond','propose'].includes(action)?{message:t}:{}),...(['accept','decline'].includes(action)?{reference}:{})}
}
