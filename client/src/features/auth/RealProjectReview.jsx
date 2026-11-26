import React,{useEffect,useRef,useState} from 'react'
import {CheckCircle2,Star} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
import '../lifecycle/workflow.css'
const dateCL=value=>new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))
const stars=[1,2,3,4,5]
function Stars({score}){return <div className="wf-rating" aria-label={score+' de 5 estrellas'}>{stars.map(n=><Star key={n} size={23} color={score>=n?'#e6a126':'#b5bdc9'} fill={score>=n?'#f5b83d':'none'}/>)}</div>}
function ReviewDetails({review,customer}){
 return <><Stars score={review.score}/><b>{review.score} de 5</b>{review.comment&&<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{review.comment}</p>}<small className="mut">Registrada el {dateCL(review.createdAt)}</small>{review.revision>1&&<small className="mut" style={{display:'block'}}>Última modificación: {dateCL(review.updatedAt)}</small>}{customer&&<small className="mut" style={{display:'block'}}>{review.editable?'Puedes modificarla hasta el '+dateCL(review.expiresAt)+' (hora de Chile continental).':'Plazo de modificación finalizado.'}</small>}</>
}
export function ReviewChatCard({event,job}){
 const review=event.review,customer=job.agreementContext?.role==='Cliente'
 return <article className="wf-chat-request-card wf-workflow-event"><div className="wf-chat-request-heading"><CheckCircle2 size={18} color="#16934a"/><b>Calificación registrada</b></div><p className="mut">Evaluación · {event.providerLabel}</p><ReviewDetails review={review} customer={customer}/>{customer&&review.editable&&<button type="button" className="btn out" onClick={()=>job.openWorkflow('review')}>Modificar calificación</button>}<small className="wf-chat-request-status">Registro de prueba · no afecta reputación pública</small></article>
}
export function RealProjectReview({context,contract,providerName,onSaved,onLater}){
 const {client,role,requestId}=context
 const [score,setScore]=useState(0),[comment,setComment]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[review,setReview]=useState(null),[editing,setEditing]=useState(false)
 const alive=useRef(false),saving=useRef(false)
 async function load(){try{const r=await messagesRequest(client,'review',role,undefined,{requestId});if(alive.current){setReview(r.review);setLoaded(true);setError('')}}catch(e){if(alive.current)setError(e.message)}}
 useEffect(()=>{alive.current=true;setLoaded(false);setEditing(false);load();return()=>{alive.current=false}},[client,role,requestId,contract.digest])
 async function save(){
  if(saving.current||!score||role!=='Cliente')return
  saving.current=true;setBusy(true);setError('')
  try{const r=await messagesRequest(client,'review',role,{requestId,agreementVersion:contract.agreementVersion,contractRevision:contract.revision,digest:contract.digest,score,comment,expectedRevision:review?.revision||0});if(alive.current){setReview(r.review);setEditing(false);onSaved?.()}}
  catch(e){if(alive.current){setError(e.message);setEditing(false)}}finally{saving.current=false;if(alive.current)setBusy(false)}
 }
 const customer=role==='Cliente',editable=customer&&review?.editable&&Date.now()<new Date(review.expiresAt).getTime()
 return <div className="card wf-review"><CheckCircle2 size={38} color="#16934a"/><h2>¡Proyecto recibido conforme!</h2>
 <p>Los pagos de prueba fueron liberados. {customer?<>¿Cómo fue tu experiencia con <b>{providerName||context.providerLabel||'la contraparte'}</b>?</>:'Evaluación del cliente.'}</p>
 {!loaded?<><p className="mut">Consultando calificación…</p>{error&&<button className="btn out" onClick={load}>Reintentar</button>}</>:review&&!editing?<><ReviewDetails review={review} customer={customer}/><p className="mut">✓ Calificación registrada</p>{editable&&<button type="button" className="btn" onClick={()=>{setScore(review.score);setComment(review.comment);setEditing(true);setError('')}}>Modificar calificación</button>}</>:customer?<><p className="mut">Puedes editar estrellas y comentario durante siete días corridos desde el primer registro. La edición no reabre pagos ni modifica garantías.</p><div className="wf-rating" role="group" aria-label="Calificación">{stars.map(n=><button type="button" key={n} aria-label={n+' estrellas'} aria-pressed={score===n} disabled={busy} onClick={()=>setScore(n)}><Star size={34} color={score>=n?'#e6a126':'#b5bdc9'} fill={score>=n?'#f5b83d':'none'}/></button>)}</div><label>Comentario (opcional)<textarea rows={4} value={comment} maxLength={1500} disabled={busy} onChange={e=>setComment(e.target.value)} placeholder="Cuenta tu experiencia con el trabajo."/></label><button type="button" className="btn" disabled={busy||!score} onClick={save}>{busy?'Guardando…':editing?'Guardar modificación':'Enviar calificación'}</button>{editing&&<button type="button" className="btn out" disabled={busy} onClick={()=>setEditing(false)}>Cancelar modificación</button>}</>:<p className="mut">Calificación del cliente pendiente.</p>}
 <button type="button" className="btn out" disabled={busy} onClick={onLater}>{review||!customer?'Volver al proyecto':'Calificar más tarde'}</button>{error&&<p role="alert" className="wf-error">{error} <button className="chip" onClick={load}>Actualizar</button></p>}<p className="mut">Evaluación de prueba guardada en el proyecto. Todavía no se publica en el perfil ni afecta su reputación.</p></div>
}
