import React,{useState} from 'react'
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
const dateText=(date,time)=>date.split('-').reverse().join('/')+' · '+time+' h'
const labels={attended:'Visita realizada',not_received:'Cliente no pudo o no quiso recibir al prestador',no_show:'Prestador no llegó',other:'No se concretó por otra razón'}
export function InteractiveRequestCard({m,job}){
 const s=job.coordination?.cards?.[m.id],q=m.request
 const [date,setDate]=useState(''),[time,setTime]=useState(''),[amount,setAmount]=useState(''),[detail,setDetail]=useState(''),[outcome,setOutcome]=useState('attended'),[note,setNote]=useState(''),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function act(action,data={}){
  if(busy||!s)return
  setBusy(true);setError('')
  try{await job.changeCoordination({messageId:m.id,expectedRevision:s.revision,action,...data});setEditing(false)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <article className={'wf-chat-request-card'+(m.me?' wf-chat-request-sent':'')}>
 <div className="wf-chat-request-heading"><span aria-hidden="true">{q.kind==='quote'?'▤':'▣'}</span><b>{q.kind==='quote'?'Solicitud de cotización':'Solicitud de visita técnica'}</b></div>
 <div className="wf-chat-request-project">Proyecto: {job.project}</div>{q.note&&<p className="wf-chat-request-note">{q.note}</p>}
 {!s?<small className="mut">Consultando estado…</small>:<>
 {s.quote&&<><b>{clp(s.quote.amount)}</b><p className="wf-chat-request-note">{s.quote.detail}</p><small>Enviada por el prestador · {new Date(s.quote.submittedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'})}</small></>}
 {s.canQuote&&<form className="wf-form" onSubmit={e=>{e.preventDefault();act('quote',{amount:Number(amount),detail})}}><label>Monto total (CLP)<input type="number" min="1" max="100000000000" step="1" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Alcance y condiciones<textarea required minLength={5} maxLength={1800} value={detail} onChange={e=>setDetail(e.target.value)}/></label><button type="submit" className="btn" disabled={busy}>Enviar cotización</button></form>}
 {s.scheduled&&<><b>Visita agendada: {dateText(s.scheduled.date,s.scheduled.time)}</b><small>Aprobada por ambas partes · horario de Chile continental</small>{s.cutoff&&<small>Modificable hasta {new Date(s.cutoff).toLocaleString('es-CL',{timeZone:'America/Santiago'})}</small>}</>}
 {s.proposal&&s.canPropose&&<><div><small>{s.scheduled?'Cambio propuesto':'Fecha propuesta'} · {s.proposal.by==='client'?'Cliente':'Prestador'}</small><b style={{display:'block'}}>{dateText(s.proposal.date,s.proposal.time)}</b></div>{s.canAccept&&<button className="btn" type="button" disabled={busy} onClick={()=>act('accept')}>Aceptar fecha y hora</button>}</>}
 {s.canPropose&&<><button className="btn out" type="button" disabled={busy} onClick={()=>{setDate(s.proposal?.date||s.scheduled?.date||q.date||'');setTime(s.proposal?.time||s.scheduled?.time||q.time||'');setEditing(!editing)}}>{editing?'Cerrar':s.scheduled?'Modificar visita':s.proposal?'Proponer otra fecha':'Proponer fecha y hora'}</button>{editing&&<form className="wf-form" onSubmit={e=>{e.preventDefault();act('propose',{date,time})}}><label>Fecha<input type="date" value={date} required onChange={e=>setDate(e.target.value)}/></label><label>Hora<input type="time" value={time} required onChange={e=>setTime(e.target.value)}/></label><small>El horario vigente se mantiene hasta que ambos aprueben el cambio.</small><button type="submit" className="btn" disabled={busy}>Enviar propuesta</button></form>}</>}
 {Object.entries(s.reports||{}).map(([side,r])=><div key={side}><small>{side==='client'?'Cliente':'Prestador'} informó:</small><b style={{display:'block'}}>{labels[r.outcome]}</b>{r.note&&<p className="wf-chat-request-note">{r.note}</p>}</div>)}
 {s.canReport&&<form className="wf-form" onSubmit={e=>{e.preventDefault();act('report',{outcome,note})}}><label>Resultado de la visita<select value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="attended">Se realizó la visita</option>{s.side==='client'?<option value="no_show">El prestador no llegó</option>:<option value="not_received">El cliente no me recibió</option>}<option value="other">No se concretó por otra razón</option></select></label><label>Observación (opcional)<textarea value={note} maxLength={800} onChange={e=>setNote(e.target.value)}/></label><small>El reporte no acredita por sí solo un incumplimiento ni genera sanciones automáticas.</small><button type="submit" className="btn" disabled={busy} onClick={e=>{if(!window.confirm('¿Confirmas el resultado de la visita? El reporte quedará registrado.'))e.preventDefault()}}>Registrar resultado</button></form>}
 <small className="wf-chat-request-status">{s.status}</small></>}
 {error&&<p className="wf-error" role="alert">{error}</p>}
 </article>
}
