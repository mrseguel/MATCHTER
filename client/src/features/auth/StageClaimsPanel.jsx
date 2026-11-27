import React,{useEffect,useRef,useState} from 'react'
import {MediationPanel} from './MediationPanel.jsx'
import {messagesRequest} from './messagesApi.js'
const reasons=[['quality_scope','Calidad o alcance de los trabajos'],['delay','Retraso'],['nonperformance','Incumplimiento o abandono'],['payment_disagreement','Desacuerdo de pago'],['communication','Comunicación'],['other','Otro motivo']]
const money=n=>Number(n).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
const labels={pending:'Pendiente de inicio',in_progress:'En ejecución',delivered:'Entrega notificada',accepted:'Recibida conforme'}
export function StageClaimsPanel({client,role,thread,initialStage,onBack}){
 const [tracking,setTracking]=useState(null),[claims,setClaims]=useState([]),[stage,setStage]=useState(''),[reason,setReason]=useState(''),[description,setDescription]=useState(''),[resolution,setResolution]=useState(''),[reference,setReference]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [caseId,setCaseId]=useState(null),[mediationEnabled,setMediationEnabled]=useState(false)
 useEffect(()=>{let alive=true;(client?.qaReadOnly===true?Promise.resolve(client.qaConfig):fetch('/api/auth-preview/config').then(r=>r.ok?r.json():null)).then(r=>{if(alive)setMediationEnabled(r?.mediationEnabled===true)}).catch(()=>{});return()=>{alive=false}},[])
 const submission=useRef(null),saving=useRef(false),requestId=thread.id
 async function load(){
  setBusy(true);setError('')
  try{
   const result=await messagesRequest(client,'claims',role,undefined,{requestId})
   setClaims(result.claims)
   try{const t=await messagesRequest(client,'stages',role,undefined,{requestId});setTracking(t);setStage(old=>t.stages.some(s=>String(s.stageNo)===old)?old:String(initialStage||t.currentStage||t.stages.at(-1)?.stageNo||''))}
   catch(e){setTracking(null);setError(e.message)}
  }catch(e){setTracking(null);setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{load()},[client,role,requestId])
 async function submit(e){
  e.preventDefault()
  if(client?.qaReadOnly===true||saving.current||!tracking||tracking.complete||!reason||description.trim().length<20||resolution.trim().length<5)return
  saving.current=true;setBusy(true);setError('');setNotice('')
  const payload={requestId,agreementVersion:tracking.agreementVersion,contractRevision:tracking.contractRevision,digest:tracking.digest,stageNo:Number(stage),reason,description,requestedResolution:resolution,contractReference:reference}
  const key=JSON.stringify(payload)
  try{
   if(submission.current?.key!==key)submission.current={key,id:crypto.randomUUID()}
   const r=await messagesRequest(client,'claims',role,{...payload,submissionId:submission.current.id})
   setClaims(old=>[r.claim,...old.filter(c=>c.id!==r.claim.id)])
   submission.current=null;setReason('');setDescription('');setResolution('');setReference('');setNotice('Reclamo registrado. Pendiente de revisión.');if(mediationEnabled)setCaseId(r.claim.id)
  }catch(e){setError(e.message)}finally{saving.current=false;setBusy(false)}
 }
 if(caseId)return <MediationPanel key={caseId} client={client} role={role} claimId={caseId} onBack={()=>{setCaseId(null);load()}}/>
 const selected=tracking?.stages.find(s=>String(s.stageNo)===stage)
 return <section className="card ct-form"><div className="row sp"><h3>Reclamos y mediación</h3><button type="button" className="chip" disabled={busy} onClick={onBack}>Volver</button></div>
 <b>{thread.project}</b><p className="mut">Contraparte: {thread.peerName} · {thread.peerRole}</p>
 <p className="mut">Entorno de prueba. Usa datos ficticios. Presentar un reclamo no modifica el contrato ni mueve fondos.</p>
 {tracking&&<><div className="row sp"><span>Etapa actual</span><b>{tracking.complete?'Proyecto recibido conforme':'Etapa '+tracking.currentStage}</b></div>
 {!tracking.complete&&client?.qaReadOnly!==true&&<form onSubmit={submit} className="ct-form">
 <label>Etapa afectada<select value={stage} onChange={e=>setStage(e.target.value)} required disabled={busy}>{tracking.stages.map(s=><option key={s.stageNo} value={s.stageNo}>Etapa {s.stageNo} · {s.title}</option>)}</select></label>
 {selected&&<div className="ct-fee-summary"><b>{selected.title}</b><p>Valor contractual: {money(selected.amount)} · Entrega prevista: {selected.date}</p>{selected.status&&<p>Estado: {labels[selected.status]||selected.status} · Avance: {selected.progressPercent} %</p>}</div>}
 <label>Motivo<select value={reason} required onChange={e=>setReason(e.target.value)} disabled={busy}><option value="">Seleccionar motivo</option>{reasons.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label>Describe lo ocurrido<textarea required minLength={20} maxLength={4000} value={description} disabled={busy} onChange={e=>setDescription(e.target.value)}/></label>
 <label>Solución solicitada<textarea required minLength={5} maxLength={1500} value={resolution} disabled={busy} onChange={e=>setResolution(e.target.value)}/></label>
 <label>Referencia contractual (opcional)<input maxLength={1000} value={reference} disabled={busy} onChange={e=>setReference(e.target.value)}/></label>
 <p className="mut">El contrato, los datos y el estado de la etapa se vinculan automáticamente. Después de registrar el reclamo podrás adjuntar evidencias en el expediente si la función está habilitada.</p>
 <button className="btn" disabled={busy||!selected||!reason||description.trim().length<20||resolution.trim().length<5}>Presentar reclamo · prueba</button>
 </form>}
 {client?.qaReadOnly===true&&<p className="mut">Vista QA de consulta. No registra nuevos reclamos.</p>}{tracking.complete&&<p className="mut">El procedimiento posterior al cierre y de garantías aún no está habilitado.</p>}</>}
 {error&&<p role="alert" className="wf-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <div className="row sp"><h4>Expedientes registrados</h4><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button></div>
 {!busy&&!error&&!claims.length&&<p className="mut">Sin expedientes cargados.</p>}
 {claims.map(c=><article className="ct-fee-summary" key={c.id}><b>Etapa {c.stageNo} · {c.stageSnapshot.title}</b><p className="mut">{c.submittedByMe?'Presentado por ti':'Presentado por la contraparte'} · {new Date(c.createdAt).toLocaleString('es-CL')}</p><p>{reasons.find(r=>r[0]===c.reason)?.[1]}</p><p>{c.description}</p><p><b>Solución solicitada:</b> {c.requestedResolution}</p>{c.contractReference&&<p>Referencia: {c.contractReference}</p>}<small>Expediente {c.id}</small>{mediationEnabled&&<button type="button" className="btn out" onClick={()=>setCaseId(c.id)}>Consultar expediente y mediación</button>}</article>)}
 </section>
}
export function ClaimsCenter({client,role,onBack}){
 const [threads,setThreads]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true)
 useEffect(()=>{let alive=true;messagesRequest(client,'',role).then(r=>{if(alive)setThreads(r.threads)}).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[client,role])
 if(selected)return <StageClaimsPanel key={selected.id} client={client} role={role} thread={selected} onBack={()=>setSelected(null)}/>
 return <section><h2>Reclamos y mediación</h2><button type="button" className="mai-secondary" onClick={onBack}>Volver a mi perfil</button><p className="mut">Selecciona una conversación para consultar el contrato, sus etapas y expedientes.</p>{error&&<p role="alert">{error}</p>}{busy?<p>Cargando proyectos…</p>:threads.length?threads.map(t=><button type="button" key={t.id} className="card" style={{display:'block',width:'100%',textAlign:'left',margin:'8px 0'}} onClick={()=>setSelected(t)}><b>{t.project}</b><p className="mut">{t.peerName} · {t.peerRole}</p></button>):<p>Sin proyectos asociados.</p>}</section>
}
