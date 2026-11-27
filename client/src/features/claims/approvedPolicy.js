// Display-only commercial policy. Authoritative billing must be implemented server-side.
export const qaPricing=Object.freeze({contract:2990,mediation:19990,dossier:4990,inspectionReserve:19990,protectedBasisPoints:288})
export const clp=n=>'$'+Number(n).toLocaleString('es-CL')
export function premiumQuote(amount){
 if(!Number.isSafeInteger(amount)||amount<1||amount>1e12)return null
 return qaPricing.contract+qaPricing.mediation+qaPricing.inspectionReserve+Math.round(amount*qaPricing.protectedBasisPoints/10000)
}
export const reasons={quality_scope:'Calidad de los trabajos',delay:'Retraso en la entrega',nonperformance:'Trabajo incompleto o incumplimiento',payment_disagreement:'Problemas con el pago',communication:'Problemas de comunicación',other:'Otro problema'}
export function caseCode(c){return 'REC-'+String(c.id).toUpperCase()}
export function claimState(c,d){
 const status=d?.inspectionResolution?.status||d?.status||c.status
 if(status==='closed_with_agreement')return {finished:true,title:'Cerrado con acuerdo',hint:'Ambas partes aceptaron la solución.',tone:'success'}
 if(status==='closed_without_agreement'&&!d?.inspectionRequested?.length)return {finished:true,title:'Cerrado sin acuerdo',hint:'Consulta las alternativas disponibles.',tone:'neutral'}
 if(status==='closed_without_agreement')return {finished:false,title:'Evaluación técnica',hint:'Consulta los antecedentes de la inspección.',tone:'pending'}
 if(status==='received')return {finished:false,title:'Reclamo recibido',hint:'El caso está registrado. Aún no tiene actuaciones.',tone:'pending'}
 if(status==='review')return {finished:false,title:'En revisión',hint:'MATCHTER está revisando los antecedentes.',tone:'pending'}
 if(status==='invited')return {finished:false,title:'Invitación a mediación',hint:'Consulta la participación de ambas partes.',tone:'pending'}
 if(status==='mediation')return {finished:false,title:'Buscando una solución',hint:'Consulta las propuestas y respuestas.',tone:'pending'}
 return {finished:false,title:'En proceso',hint:'Consulta las novedades del caso.',tone:'pending'}
}
