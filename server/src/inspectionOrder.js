// Pure validation for a future authenticated inspector service. No booking or payment side effects.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})}
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
const validText=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max
const amount=x=>Number.isSafeInteger(x)&&x>0
export function inspectionQuote({caseId,requesterAccountId,partyAccountIds,inspector,scope,feeCLP,validUntil,now=Date.now()}){
 if(!validId(caseId)||!validId(requesterAccountId)||!Array.isArray(partyAccountIds)||!partyAccountIds.includes(requesterAccountId))fail(403,'Solicitante no autorizado')
 // inspector and parties must be resolved from trusted server records, never from client claims.
 if(!validId(inspector?.accountId)||!validId(inspector?.profileId)||inspector.verified!==true||inspector.eligible!==true||partyAccountIds.includes(inspector.accountId))fail(403,'Inspector independiente no habilitado')
 if(!validText(scope,20,4000)||!amount(feeCLP)||typeof validUntil!=='string'||!Number.isFinite(Date.parse(validUntil))||Date.parse(validUntil)<=now)fail(400,'Cotización no válida')
 return {caseId,requesterAccountId,inspectorAccountId:inspector.accountId,inspectorProfileId:inspector.profileId,scope:scope.trim(),feeCLP,currency:'CLP',validUntil,status:'quoted',noMoneyMoved:true}
}
export function acceptInspectionQuote({quote,actorAccountId,acceptedFeeCLP,accepted,now=Date.now()}){
 if(!quote||quote.status!=='quoted'||actorAccountId!==quote.requesterAccountId)fail(403,'Solo el solicitante puede aceptar la cotización')
 if(Date.parse(quote.validUntil)<=now||accepted!==true||acceptedFeeCLP!==quote.feeCLP)fail(409,'Confirma una cotización vigente y su valor exacto')
 return {...quote,status:'accepted_pending_coordination',noMoneyMoved:true}
}
export function validateInspectionReport({order,actorAccountId,findings,limitations,items}){
 if(order?.status!=='accepted_pending_coordination'||actorAccountId!==order.inspectorAccountId)fail(403,'Inspector no autorizado')
 if(!validText(findings,20,10000)||!validText(limitations,5,4000)||!Array.isArray(items)||items.length>100)fail(400,'Informe incompleto')
 const lines=items.map(i=>{
  if(!i||!['repair','completion'].includes(i.kind)||!validText(i.description,3,300)||!amount(i.amountCLP))fail(400,'Partida de evaluación no válida')
  return {kind:i.kind,description:i.description.trim(),amountCLP:i.amountCLP}
 })
 const estimateCLP=lines.reduce((n,i)=>n+i.amountCLP,0)
 if(!Number.isSafeInteger(estimateCLP))fail(400,'Valor no válido')
 return {caseId:order.caseId,findings:findings.trim(),limitations:limitations.trim(),items:lines,estimateCLP,currency:'CLP',status:'technical_draft',authorizesDeduction:false}
}
