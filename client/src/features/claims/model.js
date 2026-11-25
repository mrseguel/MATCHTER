export const reasons=['Incumplimiento de lo acordado','Calidad o defectos de la obra','Atrasos o abandono','Pagos pendientes o cobros','Diferencias de alcance','Conducta o comunicación','Otro'];
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);
export const belongs=(c,id)=>same(c.complainantId,id)||same(c.respondentId,id);
export const closed=c=>['resolved','no-agreement','withdrawn'].includes(c.status);
export const statusName=c=>({submitted:'Presentado · esperando respuesta',review:'En revisión',mediation:'En mediación',proposal:'Propuesta de acuerdo',resolved:'Acuerdo aceptado por ambas partes','no-agreement':'Cerrado sin acuerdo',withdrawn:'Retirado'})[c.status]||'En revisión';
export function createClaim({id,actor,target,job,description,reason,reference,requested,evidence=[],now}){
 const a=actor?.id,b=target?.id;
 if(!a||!b||same(a,b)||!reasons.includes(reason)||clean(description).length<20||clean(requested).length<10||(!job&&!clean(reference,200)))throw Error('Completa la contraparte, el motivo, la descripción (20 caracteres), la solución esperada (10 caracteres) y la referencia.');
 if(job&&!(same(job.clientId,a)&&same(job.providerId,b)||same(job.providerId,a)&&same(job.clientId,b)))throw Error('El proyecto no corresponde a ambas partes.');
 const title=clean(job?.project||reference,200);
 return {id,title,jobId:job?.id||null,complainantId:String(a),respondentId:String(b),complainantName:actor.name,respondentName:target.name,from:actor.name,reason,description:clean(description),requested:clean(requested),status:'submitted',createdAt:now,updatedAt:now,step:0,files:evidence.map(f=>({...f,by:String(a)})),response:null,messages:[],meeting:null,proposal:null,history:[{at:now,label:'Reclamo presentado',by:String(a)}]};
}
export function applyClaim(c,action,actor,now){
 if(closed(c))throw Error('El caso está cerrado.');
 const mediator=actor?.role==='mediator',id=String(actor?.id??'');
 if(!mediator&&!belongs(c,id))throw Error('No tienes acceso a este caso.');
 const next={...c,updatedAt:now};let label;
 switch(action.type){
 case 'response':
 if(!same(c.respondentId,id)||c.response||clean(action.text).length<10)throw Error('Solo la contraparte puede registrar su primera respuesta (10 caracteres).');
 next.response={text:clean(action.text),at:now};if(c.status==='submitted')next.status='review';label='Respuesta de la contraparte registrada';break;
 case 'evidence':
 if(mediator||!action.files?.length)throw Error('Selecciona evidencia válida.');
 next.files=[...c.files,...action.files.map(f=>({...f,by:id}))];if(next.files.length>20)throw Error('Máximo 20 archivos por caso.');label='Evidencia incorporada';break;
 case 'message':
 if(!clean(action.text,1500))throw Error('Escribe un mensaje.');
 next.messages=[...c.messages,{id:action.id,by:id,name:mediator?'Mediador demo':actor.name,text:clean(action.text,1500),at:now}];label='Mensaje incorporado al expediente';break;
 case 'review':
 if(!mediator||c.status!=='submitted'&&c.status!=='review')throw Error('Etapa no disponible.');
 next.status='mediation';label='Mediación iniciada';break;
 case 'meeting':
 if(!mediator||!['mediation','proposal'].includes(c.status)||!action.date||!Number.isFinite(Date.parse(action.date))||Date.parse(action.date)<=Date.parse(now))throw Error('Programa una fecha futura de mediación.');
 next.meeting={date:action.date,confirmations:[]};label='Reunión de mediación programada';break;
 case 'confirm':
 if(mediator||!c.meeting)throw Error('No hay reunión programada.');
 next.meeting={...c.meeting,confirmations:[...new Set([...c.meeting.confirmations,id])]};label='Asistencia confirmada';break;
 case 'proposal':
 if(!mediator||!c.response||!['mediation','proposal'].includes(c.status)||clean(action.text).length<20)throw Error('Se requiere respuesta de la contraparte, mediación iniciada y propuesta detallada.');
 next.proposal={text:clean(action.text),version:(c.proposal?.version||0)+1,decisions:{},at:now};next.status='proposal';label='Propuesta de acuerdo emitida';break;
 case 'decision':
 if(mediator||c.status!=='proposal'||!c.proposal||c.proposal.decisions[id]||!['accept','reject'].includes(action.decision))throw Error('No puedes registrar esta decisión.');
 next.proposal={...c.proposal,decisions:{...c.proposal.decisions,[id]:action.decision}};
 if(action.decision==='reject'){next.status='mediation';label='Propuesta no aceptada · continúa mediación';}
 else if(next.proposal.decisions[c.complainantId]==='accept'&&next.proposal.decisions[c.respondentId]==='accept'){next.status='resolved';label='Acuerdo aceptado por ambas partes';}
 else label='Una de las partes aceptó la propuesta';
 break;
 case 'close':
 if(!mediator||!['mediation','proposal'].includes(c.status)||clean(action.text).length<15)throw Error('El cierre sin acuerdo requiere una razón documentada.');
 next.status='no-agreement';next.closure=clean(action.text);label='Cierre sin acuerdo';break;
 case 'withdraw':
 if(!same(c.complainantId,id)||!['submitted','review'].includes(c.status))throw Error('El retiro solo está disponible para quien presentó el reclamo antes de la mediación.');
 next.status='withdrawn';label='Reclamo retirado por quien lo presentó';break;
 default:throw Error('Acción no válida.');
 }
 next.step=closed(next)?3:next.status==='proposal'?2:next.status==='mediation'?1:0;
 next.history=[...c.history,{at:now,label,by:id}];return next;
}
export function progress(c){return [
 {label:'Descripción y solución solicitada',done:!!c.description&&!!c.requested},
 {label:'Evidencia incorporada',done:c.files.length>0},
 {label:'Respuesta de la contraparte',done:!!c.response},
 {label:'Mediación iniciada',done:c.history.some(h=>h.label==='Mediación iniciada')},
 {label:'Propuesta de acuerdo emitida',done:!!c.proposal},
 {label:'Acuerdo aceptado por ambas partes',done:c.status==='resolved'}
]}
