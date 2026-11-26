import {AuthError} from './identityAccounts.js'
const prefix='MATCHTER_REQUEST_V1:',day=86400000
const fail=(status,message)=>{throw new AuthError(status,message)}
const sideLabel=s=>s==='client'?'Cliente':'Prestador'
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
const parts=t=>Object.fromEntries(dateFormat.formatToParts(new Date(t)).map(p=>[p.type,p.value]))
const local=t=>{const p=parts(t);return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute}
export function chileTime(date,time){
 if(typeof date!=='string'||typeof time!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail(400,'Indica fecha y hora válidas')
 const raw=date+'T'+time,utc=Date.parse(raw+':00Z')
 if(!Number.isFinite(utc)||new Date(utc).toISOString().slice(0,16)!==raw)fail(400,'Fecha no válida')
 const candidates=new Set()
 for(const t of [utc-day,utc,utc+day]){const offset=Date.parse(local(t)+':00Z')-t;const candidate=utc-offset;if(local(candidate)===raw)candidates.add(candidate)}
 if(candidates.size!==1)fail(400,'Hora inexistente o ambigua por cambio de horario. Elige otra hora.')
 return new Date([...candidates][0]).toISOString()
}
function initial(row,match){
 if(typeof row.body!=='string'||!row.body.startsWith(prefix))return null
 let request;try{request=JSON.parse(row.body.slice(prefix.length))}catch{return null}
 if(!['quote','visit'].includes(request?.kind))return null
 const by=row.senderId===match.senderId?'client':'provider'
 let proposal=null
 if(request.kind==='visit'&&request.date&&request.time){try{proposal={date:request.date,time:request.time,at:chileTime(request.date,request.time),by}}catch{}}
 return {messageId:row.id,kind:request.kind,revision:0,requestedBy:by,quote:null,proposal,scheduled:null,reports:{},...row.state,revision:row.revision||0}
}
export function cardView(s,side,closed,now=Date.now(),superseded=false){
 const start=s.scheduled?Date.parse(s.scheduled.at):null
 const reports=s.reports||{},mine=reports[side],other=reports[side==='client'?'provider':'client']
 const reported=!!(mine||other),completed=mine?.outcome==='attended'&&other?.outcome==='attended'
 const disputed=!!(mine&&other&&!completed)
 const pending=s.proposal&&Date.parse(s.proposal.at)>now
 const canModify=(!closed||!!s.scheduled)&&!superseded&&!reported&&(!s.scheduled||now<start-day)
 const status=s.kind==='quote'?(s.quote?'Cotización realizada':closed||superseded?'Solicitud cerrada sin cotización registrada':'Cotización pendiente'):
 completed?'Visita realizada':disputed?'Incidencia de visita registrada':reported?'Resultado informado por una de las partes':s.scheduled?(s.proposal&&canModify?'Cambio de horario pendiente':now>=start?'Visita pendiente de confirmar':now>=start-day?'Visita agendada · horario cerrado':'Visita agendada'):closed||superseded?'Solicitud cerrada sin visita agendada':pending?'Pendiente de aprobación':'Coordinar fecha y hora'
 return {...s,status,side,canQuote:s.kind==='quote'&&!s.quote&&!closed&&!superseded&&side==='provider',canPropose:s.kind==='visit'&&canModify,canAccept:s.kind==='visit'&&canModify&&!!pending&&s.proposal.by!==side&&(!s.scheduled||Date.parse(s.proposal.at)>=now+day),canReport:s.kind==='visit'&&!!s.scheduled&&now>=start&&!mine&&!superseded,cutoff:s.scheduled?new Date(start-day).toISOString():null}
}
export function transition(s,side,b,closed,now=Date.now(),superseded=false){
 if(!b||typeof b!=='object'||Object.keys(b).some(k=>!['role','requestId','messageId','expectedRevision','action','amount','detail','date','time','outcome','note'].includes(k)))fail(400,'Acción no válida')
 if(!Number.isInteger(b.expectedRevision)||b.expectedRevision!==s.revision)fail(409,'La tarjeta cambió. Actualiza e intenta nuevamente.')
 const v=cardView(s,side,closed,now,superseded),stamp=new Date(now).toISOString(),next={...s,revision:s.revision+1}
 if(b.action==='quote'){
  if(!v.canQuote)fail(409,'No puedes responder esta cotización')
  if(!Number.isSafeInteger(b.amount)||b.amount<1||b.amount>100000000000||typeof b.detail!=='string'||b.detail.trim().length<5||b.detail.length>1800)fail(400,'Indica un monto total CLP y las condiciones de la cotización')
  next.quote={amount:b.amount,detail:b.detail.trim(),submittedAt:stamp}
 }else if(b.action==='propose'){
  if(!v.canPropose)fail(409,'No se puede modificar esta visita')
  const at=chileTime(b.date,b.time)
  if(Date.parse(at)<=now||s.scheduled&&Date.parse(at)<now+day)fail(400,'Elige una fecha futura que respete las 24 horas de anticipación para cambios')
  next.proposal={date:b.date,time:b.time,at,by:side}
 }else if(b.action==='accept'){
  if(!v.canAccept)fail(409,'Solo la contraparte puede aceptar una propuesta vigente')
  if(s.scheduled&&Date.parse(s.proposal.at)<now+day)fail(409,'El cambio necesita 24 horas de anticipación')
  next.scheduled={date:s.proposal.date,time:s.proposal.time,at:s.proposal.at,confirmedAt:stamp};next.proposal=null
 }else if(b.action==='report'){
  if(!v.canReport)fail(409,'Solo puedes informar el resultado después de la hora agendada, una vez por parte')
  if(!['attended','not_received','no_show','other'].includes(b.outcome)||(b.outcome==='not_received'&&side!=='provider')||(b.outcome==='no_show'&&side!=='client')||typeof (b.note??'')!=='string'||(b.note??'').length>800)fail(400,'Resultado no válido')
  next.reports={...s.reports,[side]:{outcome:b.outcome,note:(b.note||'').trim(),at:stamp}};next.proposal=null
 }else fail(400,'Acción no válida')
 return next
}
export async function coordinationContext(db,actor,id,lock=false){
 const match=(await db.query('SELECT sender_profile_id AS "senderId",recipient_profile_id AS "recipientId" FROM matchter.swipe_requests WHERE id=$1 AND status=\'accepted\' AND (sender_profile_id=$2 OR recipient_profile_id=$2)'+(lock?' FOR UPDATE':''),[id,actor.id])).rows[0]
 if(!match)fail(404,'Conversación no disponible')
 const side=match.senderId===actor.id?'client':'provider'
 if((side==='client')!==(actor.role==='Cliente'))fail(403,'Perfil no autorizado')
 const closed=!!(await db.query('SELECT 1 FROM matchter.project_agreement_versions WHERE request_id=$1 AND client_confirmed_at IS NOT NULL AND provider_confirmed_at IS NOT NULL LIMIT 1',[id])).rows.length
 const rows=(await db.query(`SELECT m.id,m.body,m.sender_profile_id AS "senderId",e.revision,e.state FROM matchter.swipe_messages m LEFT JOIN LATERAL (SELECT revision,state FROM matchter.project_coordination_events WHERE message_id=m.id ORDER BY revision DESC LIMIT 1) e ON true WHERE m.request_id=$1 AND left(m.body,length('MATCHTER_REQUEST_V1:'))='MATCHTER_REQUEST_V1:' ORDER BY m.created_at,m.id`,[id])).rows
 const cards=rows.map(r=>initial(r,match)).filter(Boolean)
 return {side,closed,cards}
}
export function coordinationView(ctx,now=Date.now()){
 const last=Object.fromEntries(ctx.cards.map(c=>[c.kind,c.messageId]))
 return {closed:ctx.closed,canQuote:!ctx.closed&&ctx.side==='client'&&!last.quote,canVisit:!ctx.closed&&!last.visit,cards:Object.fromEntries(ctx.cards.map(c=>[c.messageId,cardView(c,ctx.side,ctx.closed,now,last[c.kind]!==c.messageId)]))}
}
export async function readCoordination(db,a,id){return coordinationView(await coordinationContext(db,a,id))}
export async function changeCoordination(db,a,id,b){
 const tx=await db.connect()
 try{await tx.query('BEGIN');const ctx=await coordinationContext(tx,a,id,true),s=ctx.cards.find(c=>c.messageId===b.messageId)
 if(!s)fail(404,'Tarjeta no disponible')
 const superseded=ctx.cards.filter(c=>c.kind===s.kind).at(-1)?.messageId!==s.messageId
 const next=transition(s,ctx.side,b,ctx.closed,Date.now(),superseded)
 await tx.query('INSERT INTO matchter.project_coordination_events(message_id,revision,actor_profile_id,action,state) VALUES($1,$2,$3,$4,$5)',[s.messageId,next.revision,a.id,b.action,JSON.stringify(next)])
 await tx.query('COMMIT')
 return coordinationView({...ctx,cards:ctx.cards.map(c=>c.messageId===s.messageId?next:c)})
 }catch(e){try{await tx.query('ROLLBACK')}catch{}throw e}finally{tx.release()}
}
