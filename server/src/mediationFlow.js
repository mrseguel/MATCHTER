// Append-only case events. This module never changes payment or work status.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})}
const participant=s=>['client','provider'].includes(s)
export function mediationState(events=[]){
 const s={status:'received',invitation:null,joined:[],proposal:null,accepted:[],inspectionRequested:[],events}
 for(const e of events){
  if(e.action==='review')s.status='review'
  if(e.action==='invite'){s.status='invited';s.invitation=e.id;s.joined=[]}
  if(e.action==='join'){s.joined.push(e.side);if(s.joined.length===2)s.status='mediation'}
  if(e.action==='decline'){s.status='closed_without_agreement'}
  if(e.action==='propose'){s.proposal={id:e.id,text:e.text};s.accepted=[]}
  if(e.action==='accept'){s.accepted.push(e.side);if(s.accepted.length===2)s.status='closed_with_agreement'}
  if(e.action==='reject'){s.proposal=null;s.accepted=[]}
  if(e.action==='close')s.status='closed_without_agreement'
  if(e.action==='inspection')s.inspectionRequested.push(e.side)
 }
 return s
}
export function checkMediationAction({events=[],side,action,text,reference}){
 const s=mediationState(events),part=participant(side),mediator=side==='mediator'
 if(!part&&!mediator)fail(403,'Acceso no autorizado')
 if(s.status.startsWith('closed'))fail(409,'Expediente cerrado')
 const note=typeof text==='string'?text.trim():''
 if(text!==undefined&&(typeof text!=='string'||text.length>4000))fail(400,'Texto no válido')
 if(reference!==undefined&&typeof reference!=='string')fail(400,'Referencia no válida')
 const needsText=['comment','propose','close','inspection'].includes(action)
 if(needsText&&note.length<5)fail(400,'Describe los antecedentes o la propuesta')
 if(!needsText&&text!==undefined)fail(400,'Texto no corresponde a esta acción')
 if(!['join','decline','accept','reject'].includes(action)&&reference!==undefined)fail(400,'Referencia no corresponde a esta acción')
 switch(action){
 case 'comment':break
 case 'review':if(!mediator||s.status!=='received')fail(409,'Revisión no disponible');break
 case 'invite':if(!mediator||s.status!=='review')fail(409,'Invitación no disponible');break
 case 'join':case 'decline':
  if(!part||s.status!=='invited'||reference!==s.invitation||s.joined.includes(side))fail(409,'Invitación no disponible');break
 case 'propose':if(!mediator||s.status!=='mediation')fail(409,'Primero deben aceptar ambas partes la mediación');break
 case 'accept':case 'reject':
  if(!part||s.status!=='mediation'||!s.proposal||reference!==s.proposal.id||s.accepted.includes(side))fail(409,'Propuesta no disponible');break
 case 'close':if(!mediator||s.status==='received')fail(409,'Cierre no disponible');break
 case 'inspection':if(!part||s.inspectionRequested.includes(side))fail(409,'Solicitud ya registrada o no disponible');break
 default:fail(400,'Acción no válida')
 }
 return {action,side,...(needsText?{text:note}:{}),...(reference!==undefined?{reference}:{})}
}
