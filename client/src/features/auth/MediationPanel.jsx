import React,{useEffect,useRef,useState} from 'react'
import {InspectionCasePanel} from './InspectionPanel.jsx'
import {messagesRequest} from './messagesApi.js'
const statuses={received:'Recibido',review:'En revisión',invited:'Invitación a mediación',mediation:'Mediación en curso',closed_with_agreement:'Cerrado con acuerdo',closed_without_agreement:'Cerrado sin acuerdo'}
const actions={comment:'Antecedentes',review:'Revisión iniciada',invite:'Invitación a mediación',join:'Aceptó participar',decline:'Declinó la mediación',propose:'Propuesta de solución',accept:'Aceptó la propuesta',reject:'Rechazó la propuesta',decision_decline:'No aceptó la propuesta de mediación',close:'Cierre sin acuerdo',inspection:'Solicitud de inspección'}
const roles={client:'Cliente',provider:'Prestador',mediator:'Mediador'}
async function adminRequest(client,path='',body){
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('Sesión no válida')
 const res=await fetch('/api/auth-preview/admin/mediation'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
 const data=await res.json().catch(()=>null)
 if(path==='/access'&&(res.status===403||res.status===404))return {authorized:false}
 if(!res.ok||!data)throw Error(data?.message||'Mediación no disponible')
 return data
}
export const mediationAccess=client=>adminRequest(client,'/access')
function downloadCase(data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}))
 const a=document.createElement('a');a.href=url;a.download='expediente-matchter-'+data.case.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function SignedDisputeReminder({reminder}){
 const date=value=>new Date(value).toLocaleString('es-CL',{timeZone:'America/Santiago'})
 if(!reminder?.available)return <section className="ct-fee-summary" aria-label="Cláusula contractual"><b>Cláusula contractual</b><p role="status">{reminder?.message||'No se pudo verificar la cláusula original.'}</p></section>
 return <section className="ct-fee-summary" aria-label="Cláusula de controversias firmada">
 <h4>Recuerda lo acordado en tu contrato</h4>
 <p>Esta es la cláusula original del contrato asociado al reclamo, aceptada por ambas partes mediante sus firmas de prueba. Si la mediación termina sin acuerdo, consulta el procedimiento que corresponde a esta modalidad.</p>
 <b>{reminder.title}</b><p style={{whiteSpace:'pre-wrap',lineHeight:1.55}}>{reminder.text}</p>
 <div className="row sp"><span>Firma de prueba del cliente</span><b>{date(reminder.clientSignedAt)}</b></div>
 <div className="row sp"><span>Firma de prueba del prestador</span><b>{date(reminder.providerSignedAt)}</b></div>
 <small className="mut">Acuerdo versión {reminder.agreementVersion} · Contrato revisión {reminder.contractRevision}. Recordatorio informativo; no constituye nueva aceptación ni autorización de pago.</small>
 </section>
}
export function MediationPanel({client,role,claimId,mediator=false,onBack}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[kind,setKind]=useState('comment')
 const [inspectionsEnabled,setInspectionsEnabled]=useState(false)
 useEffect(()=>{let alive=true;fetch('/api/auth-preview/config').then(r=>r.ok?r.json():null).then(r=>{if(alive)setInspectionsEnabled(r?.inspectionsEnabled===true)}).catch(()=>{});return()=>{alive=false}},[])
 const pending=useRef(null),running=useRef(false),alive=useRef(false)
 async function request(body){return mediator?adminRequest(client,'/case'+(body?'':'?'+new URLSearchParams({claimId})),body):messagesRequest(client,'mediation',role,body,{claimId})}
 async function load(){if(running.current)return;running.current=true;setBusy(true);setError('');try{const r=await request();if(alive.current)setData(r)}catch(e){if(alive.current)setError(e.message)}finally{running.current=false;if(alive.current)setBusy(false)}}
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false}},[claimId,client,role,mediator])
 async function act(action,text,reference){
  if(running.current)return
  running.current=true;setBusy(true);setError('')
  const payload={claimId,action,...(text!==undefined?{text}:{}),...(reference!==undefined?{reference}:{})}
  const key=JSON.stringify(payload)
  try{if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};const r=await request({...payload,submissionId:pending.current.id});pending.current=null;if(alive.current){setData(r);setNote('')}}
  catch(e){if(alive.current)setError(e.message)}finally{running.current=false;if(alive.current)setBusy(false)}
 }
 async function exportRecord(){
  if(running.current)return
  running.current=true;setBusy(true);setError('')
  try{const result=mediator?await adminRequest(client,'/export?'+new URLSearchParams({claimId})):await messagesRequest(client,'mediation/export',role,undefined,{claimId});downloadCase(result)}
  catch(e){if(alive.current)setError(e.message)}finally{running.current=false;if(alive.current)setBusy(false)}
 }
 const closed=data?.status.startsWith('closed'),side=data?.side,canRespond=data?.status==='mediation'&&data.proposal&&!data.accepted.includes(side)&&!data.rejected?.includes(side)
 const options=[['comment','Agregar antecedentes'],...(mediator&&data?.status==='mediation'?[['propose','Proponer solución']]:[]),...(mediator&&data?.status!=='received'?[['close','Cerrar sin acuerdo (motivo)']]:[])]
 return <section className="card ct-form"><div className="row sp"><h3>Expediente de mediación</h3><button type="button" className="chip" disabled={busy} onClick={onBack}>Volver</button></div>{error&&<p role="alert">{error}</p>}<button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button>
 {data&&<><b>{data.claim.projectTitle} · Etapa {data.claim.stageNo}</b><p>{statuses[data.status]}</p><p className="mut">Reclamo de {roles[data.claim.side]}: {data.claim.description}</p><p>Solución solicitada: {data.claim.requestedResolution}</p><p className="mut">No se descuentan ni liberan fondos en esta prueba.</p>
 {!closed&&<>{mediator&&data.status==='received'&&<button className="btn" disabled={busy} onClick={()=>act('review')}>Iniciar revisión</button>}{mediator&&data.status==='review'&&<button className="btn" disabled={busy} onClick={()=>act('invite')}>Invitar a ambas partes</button>}
 {data.status==='invited'&&<><p>Participación confirmada: {data.joined.length} de 2</p>{!mediator&&!data.joined.includes(side)&&<><button className="btn" disabled={busy} onClick={()=>act('join',undefined,data.invitation)}>Aceptar mediación voluntaria</button><button className="btn out" disabled={busy} onClick={()=>act('decline',undefined,data.invitation)}>No participar</button></>}</>}
 {data.proposal&&<div className="ct-fee-summary"><b>Propuesta vigente</b><p>{data.proposal.text}</p><p>De acuerdo: {data.accepted.length} · En desacuerdo: {data.rejected?.length||0} · Pendientes: {2-data.accepted.length-(data.rejected?.length||0)}</p>{!mediator&&canRespond&&<><button className="btn gr" disabled={busy} onClick={()=>act('accept',undefined,data.proposal.id)}>Aceptar esta propuesta</button><button className="btn out" disabled={busy} onClick={()=>act('decision_decline',undefined,data.proposal.id)}>No estoy de acuerdo</button></>}</div>}
 <form className="ct-form" onSubmit={e=>{e.preventDefault();if(note.trim().length>=5&&options.some(o=>o[0]===kind))act(kind,note)}}><label>Actuación<select value={kind} onChange={e=>setKind(e.target.value)}>{options.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Descripción<textarea required minLength={5} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn out" disabled={busy||note.trim().length<5||!options.some(o=>o[0]===kind)}>Registrar actuación</button></form></>}
 {data.status==='closed_without_agreement'&&<section className="ct-fee-summary" aria-label="Inspección técnica después de mediación sin acuerdo">
 <h4>Inspección técnica</h4><p>La mediación terminó sin acuerdo. Una evaluación independiente puede determinar el estado de los trabajos, las reparaciones o partidas pendientes y su costo estimado.</p>
 <SignedDisputeReminder reminder={data.contractReminder}/>
 {data.claim.mode==='direct'?<><p className="mut">Contratación directa: la inspección es voluntaria. Se debe buscar un profesional independiente, cotizar el alcance y los honorarios y aceptar el precio antes de contratar. Quien solicite el servicio acuerda su costo, salvo acuerdo distinto entre las partes. El informe no ordena descuentos ni movimientos de fondos dentro de MATCHTER.</p>
 {data.inspectionRequested.length>0&&<p role="status">Solicitud registrada por: {data.inspectionRequested.map(x=>roles[x]).join(', ')}. Consulta el estado de la cotización y contratación en el panel de inspección.</p>}
 {!mediator&&!data.inspectionRequested.includes(side)&&<form className="ct-form" onSubmit={e=>{e.preventDefault();if(note.trim().length>=5)act('inspection',note)}}><label>Describe qué debe evaluar el profesional<textarea required minLength={5} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button type="submit" className="btn out" disabled={busy||note.trim().length<5}>Solicitar inspección técnica</button></form>}{inspectionsEnabled&&!mediator&&<InspectionCasePanel key={claimId} client={client} role={role} claimId={claimId} requested={data.inspectionRequested.includes(side)}/>}</>:<p className="mut">La contratación protegida y su procedimiento pericial todavía no están habilitados. Consulta las condiciones del documento original; no se aplican nuevas obligaciones a este contrato.</p>}
 </section>}

 <h4>Historial</h4>{data.events.map(e=><div className="ct-fee-summary" key={e.id}><b>{actions[e.action]} · {roles[e.side]}</b><small style={{display:'block'}}>{new Date(e.recordedAt).toLocaleString('es-CL')}</small>{e.text&&<p>{e.text}</p>}</div>)}<button className="btn out" disabled={busy} onClick={exportRecord}>Descargar expediente</button><p className="mut">Incluye el registro, acuerdo, contrato original de prueba y, si existe, el registro e informe textual de inspección en JSON. Fotografías y documentos firmados todavía no se adjuntan.</p></>}
 </section>
}
export function MediationAdminCenter({client,onBack}){
 const [cases,setCases]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState('')
 useEffect(()=>{let alive=true;adminRequest(client).then(r=>{if(alive)setCases(r.cases)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[client])
 if(selected)return <MediationPanel key={selected} client={client} mediator claimId={selected} onBack={()=>setSelected(null)}/>
 return <section><h2>Administración · Mediación</h2><button className="mai-secondary" onClick={onBack}>Volver</button>{error&&<p role="alert">{error}</p>}{cases.map(c=><button key={c.id} className="btn out" onClick={()=>setSelected(c.id)}>{c.projectTitle} · Etapa {c.stageNo}</button>)}</section>
}
