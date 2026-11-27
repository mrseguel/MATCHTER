import React,{useEffect,useRef,useState} from 'react'
import {messagesRequest} from './messagesApi.js'
const statuses={received:'Recibido',review:'En revisión',invited:'Invitación a mediación',mediation:'Mediación en curso',closed_with_agreement:'Cerrado con acuerdo',closed_without_agreement:'Cerrado sin acuerdo'}
const actions={comment:'Antecedentes',review:'Revisión iniciada',invite:'Invitación a mediación',join:'Aceptó participar',decline:'Declinó la mediación',propose:'Propuesta de solución',accept:'Aceptó la propuesta',reject:'Rechazó la propuesta',close:'Cierre sin acuerdo',inspection:'Solicitud de inspección'}
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
export function MediationPanel({client,role,claimId,mediator=false,onBack}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[kind,setKind]=useState('comment')
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
 const closed=data?.status.startsWith('closed'),side=data?.side,canRespond=data?.status==='mediation'&&data.proposal&&!data.accepted.includes(side)
 const options=[['comment','Agregar antecedentes'],...(mediator&&data?.status==='mediation'?[['propose','Proponer solución']]:[]),...(mediator&&data?.status!=='received'?[['close','Cerrar sin acuerdo (motivo)']]:[]),...(!mediator&&!data?.inspectionRequested.includes(side)?[['inspection','Solicitar inspección técnica']]:[])]
 return <section className="card ct-form"><div className="row sp"><h3>Expediente de mediación</h3><button type="button" className="chip" disabled={busy} onClick={onBack}>Volver</button></div>{error&&<p role="alert">{error}</p>}<button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button>
 {data&&<><b>{data.claim.projectTitle} · Etapa {data.claim.stageNo}</b><p>{statuses[data.status]}</p><p className="mut">Reclamo de {roles[data.claim.side]}: {data.claim.description}</p><p>Solución solicitada: {data.claim.requestedResolution}</p><p className="mut">No se descuentan ni liberan fondos. La visita técnica es opcional y requiere cotización y aceptación separadas.</p>
 {!closed&&<>{mediator&&data.status==='received'&&<button className="btn" disabled={busy} onClick={()=>act('review')}>Iniciar revisión</button>}{mediator&&data.status==='review'&&<button className="btn" disabled={busy} onClick={()=>act('invite')}>Invitar a ambas partes</button>}
 {data.status==='invited'&&<><p>Participación confirmada: {data.joined.length} de 2</p>{!mediator&&!data.joined.includes(side)&&<><button className="btn" disabled={busy} onClick={()=>act('join',undefined,data.invitation)}>Aceptar mediación voluntaria</button><button className="btn out" disabled={busy} onClick={()=>act('decline',undefined,data.invitation)}>No participar</button></>}</>}
 {data.proposal&&<div className="ct-fee-summary"><b>Propuesta vigente</b><p>{data.proposal.text}</p><p>Confirmaciones: {data.accepted.length} de 2</p>{!mediator&&canRespond&&<><button className="btn gr" disabled={busy} onClick={()=>act('accept',undefined,data.proposal.id)}>Aceptar esta propuesta</button><button className="btn out" disabled={busy} onClick={()=>act('reject',undefined,data.proposal.id)}>Rechazar propuesta</button></>}</div>}
 <form className="ct-form" onSubmit={e=>{e.preventDefault();if(note.trim().length>=5&&options.some(o=>o[0]===kind))act(kind,note)}}><label>Actuación<select value={kind} onChange={e=>setKind(e.target.value)}>{options.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Descripción<textarea required minLength={5} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn out" disabled={busy||note.trim().length<5||!options.some(o=>o[0]===kind)}>Registrar actuación</button></form></>}
 <h4>Historial</h4>{data.events.map(e=><div className="ct-fee-summary" key={e.id}><b>{actions[e.action]} · {roles[e.side]}</b><small style={{display:'block'}}>{new Date(e.recordedAt).toLocaleString('es-CL')}</small>{e.text&&<p>{e.text}</p>}</div>)}<button className="btn out" disabled={busy} onClick={exportRecord}>Descargar expediente</button><p className="mut">Incluye el registro, acuerdo y contrato de prueba originales en JSON. Fotografías e informe técnico adjunto pendientes de integración.</p></>}
 </section>
}
export function MediationAdminCenter({client,onBack}){
 const [cases,setCases]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState('')
 useEffect(()=>{let alive=true;adminRequest(client).then(r=>{if(alive)setCases(r.cases)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[client])
 if(selected)return <MediationPanel key={selected} client={client} mediator claimId={selected} onBack={()=>setSelected(null)}/>
 return <section><h2>Administración · Mediación</h2><button className="mai-secondary" onClick={onBack}>Volver</button>{error&&<p role="alert">{error}</p>}{cases.map(c=><button key={c.id} className="btn out" onClick={()=>setSelected(c.id)}>{c.projectTitle} · Etapa {c.stageNo}</button>)}</section>
}
