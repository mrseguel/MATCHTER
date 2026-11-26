import React,{useEffect,useRef,useState} from 'react'
import {CheckCircle2,Star} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
import '../lifecycle/workflow.css'
export function RealProjectReview({context,contract,providerName,onSaved,onLater}){
 const {client,role,requestId}=context
 const [score,setScore]=useState(0),[comment,setComment]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[review,setReview]=useState(null)
 const alive=useRef(false),saving=useRef(false)
 useEffect(()=>{alive.current=true;setLoaded(false);messagesRequest(client,'review',role,undefined,{requestId}).then(r=>{if(alive.current){setReview(r.review);setLoaded(true)}}).catch(e=>{if(alive.current)setError(e.message)});return()=>{alive.current=false}},[client,role,requestId,contract.digest])
 async function save(){
  if(saving.current||!score||role!=='Cliente')return
  saving.current=true;setBusy(true);setError('')
  try{const r=await messagesRequest(client,'review',role,{requestId,agreementVersion:contract.agreementVersion,contractRevision:contract.revision,digest:contract.digest,score,comment});if(alive.current){setReview(r.review);onSaved?.()}}
  catch(e){if(alive.current)setError(e.message)}finally{saving.current=false;if(alive.current)setBusy(false)}
 }
 return <div className="card wf-review"><CheckCircle2 size={38} color="#16934a"/><h2>¡Proyecto recibido conforme!</h2>
 <p>Los pagos de prueba fueron liberados. ¿Cómo fue tu experiencia con <b>{providerName||context.providerLabel||'la contraparte'}</b>?</p>
 {!loaded?<p className="mut">Consultando calificación…</p>:review?<><div className="wf-rating" aria-label={review.score+' de 5 estrellas'}>{[1,2,3,4,5].map(n=><Star key={n} size={30} color={review.score>=n?'#e6a126':'#b5bdc9'} fill={review.score>=n?'#f5b83d':'none'}/>)}</div><p>{review.comment}</p><p className="mut">✓ Calificación registrada</p></>:role==='Cliente'?<><div className="wf-rating" role="group" aria-label="Calificación">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={n+' estrellas'} aria-pressed={score===n} disabled={busy} onClick={()=>setScore(n)}><Star size={34} color={score>=n?'#e6a126':'#b5bdc9'} fill={score>=n?'#f5b83d':'none'}/></button>)}</div><label>Comentario (opcional)<textarea rows={4} value={comment} maxLength={1500} disabled={busy} onChange={e=>setComment(e.target.value)} placeholder="Cuenta tu experiencia con el trabajo."/></label><button type="button" className="btn" disabled={busy||!score} onClick={save}>{busy?'Guardando…':'Enviar calificación'}</button></>:<p className="mut">Calificación del cliente pendiente.</p>}
 <button type="button" className="btn out" disabled={busy} onClick={onLater}>{review?'Volver al proyecto':'Calificar más tarde'}</button>{error&&<p role="alert" className="wf-error">{error}</p>}<p className="mut">Evaluación de prueba guardada en el proyecto. Todavía no se publica en el perfil ni afecta su reputación.</p></div>
}
