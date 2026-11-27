import {inspectionQuote,acceptInspectionQuote,validateInspectionReport} from './inspectionOrder.js'
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})}
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max
export function inspectionState(events=[]){
 const s={status:'awaiting_quote',quote:null,visit:null,report:null}
 for(const e of events){
  if(e.action==='quote'){s.quote={id:e.id,...e.quote};s.status='quoted'}
  if(e.action==='accept'){s.status='accepted_pending_coordination'}
  if(e.action==='visit'){s.visit={id:e.id,at:e.at};s.status='visit_proposed'}
  if(e.action==='confirm_visit')s.status='visit_confirmed'
  if(e.action==='report'){s.report=e.report;s.status='report_delivered'}
 }
 return s
}
// trusted order, actor and eligibility supplied by the locked authenticated service.
export function nextInspectionEvent({order,events=[],actor,action,input={},now=Date.now()}){
 const s=inspectionState(events),inspector=actor.profileId===order.inspectorProfileId&&actor.accountId===order.inspector.accountId,
 requester=actor.profileId===order.requesterProfileId&&actor.accountId===order.requesterAccountId
 if(!inspector&&!requester)fail(403,'Acción reservada a solicitante o inspector asignado')
 if(s.status==='report_delivered')fail(409,'Informe ya entregado')
 if(inspector&&(!order.inspector.verified||!order.inspector.eligible))fail(403,'Inspector no habilitado')
 const shape=keys=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))fail(400,'Datos no válidos')}
 if(action==='quote'){
  shape(['feeCLP','validUntil','scope'])
  if(!inspector||!['awaiting_quote','quoted'].includes(s.status))fail(409,'Cotización no disponible')
  const quote=inspectionQuote({caseId:order.caseId,requesterAccountId:order.requesterAccountId,partyAccountIds:order.partyAccountIds,inspector:order.inspector,scope:input.scope,feeCLP:input.feeCLP,validUntil:input.validUntil,now})
  return {action,quote}
 }
 if(action==='accept'){
  shape(['quoteId','feeCLP','accepted'])
  if(!requester||s.status!=='quoted'||s.quote.id!==input.quoteId||!order.inspector.eligible||!order.inspector.verified)fail(409,'Cotización no disponible')
  acceptInspectionQuote({quote:s.quote,actorAccountId:actor.accountId,acceptedFeeCLP:input.feeCLP,accepted:input.accepted,now})
  return {action,quoteId:s.quote.id,feeCLP:s.quote.feeCLP}
 }
 if(action==='visit'){
  shape(['at'])
  if(!inspector||!['accepted_pending_coordination','visit_proposed'].includes(s.status)||typeof input.at!=='string'||!Number.isFinite(Date.parse(input.at))||Date.parse(input.at)<=now)fail(409,'Propón una visita futura')
  return {action,at:new Date(input.at).toISOString()}
 }
 if(action==='confirm_visit'){
  shape(['visitId','accepted'])
  if(!requester||s.status!=='visit_proposed'||s.visit.id!==input.visitId||input.accepted!==true||Date.parse(s.visit.at)<=now)fail(409,'Confirma una visita vigente')
  return {action,visitId:s.visit.id}
 }
 if(action==='report'){
  shape(['findings','limitations','items','visitedAt'])
  if(!inspector||s.status!=='visit_confirmed'||typeof input.visitedAt!=='string'||!Number.isFinite(Date.parse(input.visitedAt))||Date.parse(input.visitedAt)>now||Date.parse(input.visitedAt)<Date.parse(s.visit.at))fail(409,'Registra la visita realizada antes del informe')
  const report=validateInspectionReport({order:{...s.quote,status:'accepted_pending_coordination'},actorAccountId:actor.accountId,findings:input.findings,limitations:input.limitations,items:input.items})
  return {action,report:{...report,status:'submitted_demo',visitedAt:new Date(input.visitedAt).toISOString(),authorizesDeduction:false}}
 }
 fail(400,'Acción de inspección no válida')
}
