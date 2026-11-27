import React,{useEffect,useRef,useState} from 'react'
import '../claims/approvedClaims.css'
import './staffCasePanels.css'
import {InspectionCasePanel} from './InspectionPanel.jsx'
import {InspectionAttachments} from './InspectionAttachments.jsx'
import {messagesRequest} from './messagesApi.js'
const statuses={received:'Recibido',review:'En revisión',invited:'Invitación a mediación',mediation:'Mediación en curso',closed_with_agreement:'Cerrado con acuerdo',closed_without_agreement:'Cerrado sin acuerdo'}
const actions={comment:'Antecedentes',review:'Revisión iniciada',invite:'Invitación a mediación',join:'Aceptó participar',decline:'Declinó la mediación',propose:'Propuesta de solución',accept:'Aceptó la propuesta',reject:'Rechazó la propuesta',decision_decline:'No aceptó la propuesta de mediación',close:'Cierre sin acuerdo',inspection:'Solicitud de inspección',inspection_observation:'Observación al informe',inspection_propose:'Propuesta posterior al informe',inspection_accept:'Aceptó resolución técnica',inspection_decline:'No aceptó resolución técnica',inspection_close:'Cierre de revisión técnica sin acuerdo'}
const roles={client:'Cliente',provider:'Prestador',mediator:'Mediador'}
async function adminRequest(client,path='',body){
 if(client?.qaReadOnly===true&&typeof client.qaAdminRequest==='function'){if(body!==undefined)throw Error('Vista QA de solo lectura');return client.qaAdminRequest(path)}
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
function InspectionResolutionPanel({state,side,busy,onAct,readOnly=false}){
 const [note,setNote]=useState(''),[kind,setKind]=useState('inspection_propose')
 const mediator=side==='mediator',closed=state.status.startsWith('closed')
 const responded=state.accepted.includes(side)||state.rejected.includes(side)
 async function submit(e){e.preventDefault();if(note.trim().length<5)return;await onAct(mediator?kind:'inspection_observation',note,state.reportId);setNote('')}
 return <section className="ct-fee-summary"><h4>Resolución posterior a la inspección</h4>
 <p className="mut">Contratación directa: el informe es un antecedente técnico. Las partes conservan sus derechos y gestionan los pagos, descuentos o reparaciones fuera de MATCHTER.</p>
 {state.proposal&&<div className="card"><b>Propuesta de solución</b><p>{state.proposal.text}</p><p>Conforme: {state.accepted.length} · No conforme: {state.rejected.length}</p>{!readOnly&&!closed&&!mediator&&!responded&&<><button className="btn gr" disabled={busy} onClick={()=>onAct('inspection_accept',undefined,state.proposal.id)}>Estoy de acuerdo</button><button className="btn out" disabled={busy} onClick={()=>onAct('inspection_decline',undefined,state.proposal.id)}>No estoy de acuerdo</button></>}</div>}
 {closed?<p role="status"><b>{state.status==='closed_with_agreement'?'Revisión cerrada con acuerdo registrado':'Revisión cerrada sin acuerdo. Las partes pueden resolver externamente.'}</b></p>:readOnly?<p className="mut">Resolución en consulta.</p>:<form className="ct-form" onSubmit={submit}>{mediator&&<label>Actuación<select value={kind} onChange={e=>setKind(e.target.value)}><option value="inspection_propose">Proponer resolución</option><option value="inspection_close">Cerrar sin acuerdo</option></select></label>}<label>{mediator?'Fundamento de la resolución':'Observaciones al informe'}<textarea required minLength={5} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn out" disabled={busy||note.trim().length<5}>Registrar</button></form>}
 </section>
}
export function MediationPanel({client,role,claimId,mediator=false,onBack}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[kind,setKind]=useState('comment')
 const [inspectionsEnabled,setInspectionsEnabled]=useState(false),[completionEnabled,setCompletionEnabled]=useState(false)
 useEffect(()=>{let alive=true;(client?.qaReadOnly===true?Promise.resolve(client.qaConfig):fetch('/api/auth-preview/config').then(r=>r.ok?r.json():null)).then(r=>{if(alive){setInspectionsEnabled(r?.inspectionsEnabled===true);setCompletionEnabled(r?.caseCompletionEnabled===true)}}).catch(()=>{});return()=>{alive=false}},[])
 const pending=useRef(null),running=useRef(false),alive=useRef(false)
 async function request(body){return mediator?adminRequest(client,'/case'+(body?'':'?'+new URLSearchParams({claimId})),body):messagesRequest(client,'mediation',role,body,{claimId})}
 async function load(){if(running.current)return;running.current=true;setBusy(true);setError('');try{const r=await request();if(alive.current)setData(r)}catch(e){if(alive.current)setError(e.message)}finally{running.current=false;if(alive.current)setBusy(false)}}
 useEffect(()=>{alive.current=true;load();const timer=setInterval(async()=>{if(running.current)return;running.current=true;try{const result=await request();if(alive.current)setData(result)}catch{}finally{running.current=false}},8000);return()=>{alive.current=false;clearInterval(timer)}},[claimId,client,role,mediator])
 async function act(action,text,reference){
  if(client?.qaReadOnly===true||running.current)return
  running.current=true;setBusy(true);setError('')
  const payload={claimId,action,...(text!==undefined?{text}:{}),...(reference!==undefined?{reference}:{})}
  const key=JSON.stringify(payload)
  try{if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};const r=await request({...payload,submissionId:pending.current.id});pending.current=null;if(alive.current){setData(r);setNote('')}}
  catch(e){if(alive.current)setError(e.message)}finally{running.current=false;if(alive.current)setBusy(false)}
 }
 async function exportRecord(format='json'){
  if(running.current)return
  running.current=true;setBusy(true);setError('')
  try{const result=mediator?await adminRequest(client,'/export?'+new URLSearchParams({claimId})):await messagesRequest(client,'mediation/export',role,undefined,{claimId});if(format==='json'){downloadCase(result);return}
   const {buildCasePdf,buildCaseArchive}=await import('./caseDossier.js')
   const bytes=format==='pdf'?buildCasePdf(result):await buildCaseArchive(result,async(kind,fileId)=>{
    const query=kind==='reclamo'?{claimId,fileId}:{orderId:result.inspection.id,fileId}
    return mediator?adminRequest(client,(kind==='reclamo'?'/evidence-file':'/inspection-attachment')+'?'+new URLSearchParams(query)):messagesRequest(client,kind==='reclamo'?'mediation/evidence-file':'inspections/attachment',role,undefined,query)
   },async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''))
   const url=URL.createObjectURL(new Blob([bytes],{type:format==='pdf'?'application/pdf':'application/zip'})),a=document.createElement('a')
   a.href=url;a.download='expediente-matchter-'+claimId+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  catch(e){if(alive.current)setError(e.message)}finally{running.current=false;if(alive.current)setBusy(false)}
 }
 const closed=data?.status.startsWith('closed'),side=data?.side,canRespond=data?.status==='mediation'&&data.proposal&&!data.accepted.includes(side)&&!data.rejected?.includes(side)
 const options=[['comment','Agregar antecedentes'],...(mediator&&data?.status==='mediation'?[['propose','Proponer solución']]:[]),...(mediator&&data?.status!=='received'?[['close','Cerrar sin acuerdo (motivo)']]:[])]
 return <section className="mr mr-staff"><div className="mr-header"><button type="button" disabled={busy} onClick={onBack}>‹ Volver</button><b>Expediente de mediación</b><button type="button" className="ms-refresh" disabled={busy} onClick={load}>Actualizar</button></div>{error&&<p role="alert">{error}</p>}
 {data&&<><small className="mr-code">REC-{String(claimId).toUpperCase()}</small><h1>{data.claim.projectTitle}</h1><p className="mr-muted">Etapa {data.claim.stageNo} · Reclamo de {roles[data.claim.side]}</p><div className={"mr-status "+(data.inspectionResolution?.status==="closed_with_agreement"||data.status==="closed_with_agreement"?"success":"pending")}><b>{data.inspectionResolution?.status==="closed_with_agreement"?"Cerrado con acuerdo":statuses[data.status]}</b><p>No se descuentan ni liberan fondos en esta prueba.</p></div><details className="mr-accordion"><summary>Descripción del reclamo</summary><div><p>{data.claim.description}</p><b>Solución solicitada</b><p>{data.claim.requestedResolution}</p></div></details>
 {!closed&&client?.qaReadOnly!==true&&<>{mediator&&data.status==='received'&&<button className="btn" disabled={busy} onClick={()=>act('review')}>Iniciar revisión</button>}{mediator&&data.status==='review'&&<button className="btn" disabled={busy} onClick={()=>act('invite')}>Invitar a ambas partes</button>}
 {data.status==='invited'&&<><p>Participación confirmada: {data.joined.length} de 2</p>{!mediator&&!data.joined.includes(side)&&<><button className="btn" disabled={busy} onClick={()=>act('join',undefined,data.invitation)}>Aceptar mediación voluntaria</button><button className="btn out" disabled={busy} onClick={()=>act('decline',undefined,data.invitation)}>No participar</button></>}</>}
 {data.proposal&&<div className="ct-fee-summary"><b>Propuesta vigente</b><p>{data.proposal.text}</p><p>De acuerdo: {data.accepted.length} · En desacuerdo: {data.rejected?.length||0} · Pendientes: {2-data.accepted.length-(data.rejected?.length||0)}</p>{!mediator&&canRespond&&<><button className="btn gr" disabled={busy} onClick={()=>act('accept',undefined,data.proposal.id)}>Aceptar esta propuesta</button><button className="btn out" disabled={busy} onClick={()=>act('decision_decline',undefined,data.proposal.id)}>No estoy de acuerdo</button></>}</div>}
 <form className="ct-form" onSubmit={e=>{e.preventDefault();if(note.trim().length>=5&&options.some(o=>o[0]===kind))act(kind,note)}}><label>Actuación<select value={kind} onChange={e=>setKind(e.target.value)}>{options.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Descripción<textarea required minLength={5} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn out" disabled={busy||note.trim().length<5||!options.some(o=>o[0]===kind)}>Registrar actuación</button></form></>}
 {data.status==='closed_without_agreement'&&<details className="mr-accordion" aria-label="Inspección técnica después de mediación sin acuerdo"><summary>Inspección técnica</summary><div>{data.inspection&&<div className="ct-fee-summary"><b>Profesional elegido para este expediente</b><p>{data.inspection.inspector.displayName} · {data.inspection.inspector.specialty}</p><p className="mut">{data.inspection.inspector.serviceArea} · Perfil vinculado al caso</p><p>{data.inspection.report?'Informe técnico recibido':'Pendiente de informe técnico'}</p><InspectionAttachments key={data.inspection.id} client={client} role={role} orderId={data.inspection.id} mediator={mediator}/>{data.inspection.report&&<><p>{data.inspection.report.findings}</p><p>{data.inspection.report.limitations}</p>{data.inspection.report.items.map((i,n)=><p key={n}>{i.description}: {Number(i.amountCLP).toLocaleString('es-CL',{style:'currency',currency:'CLP'})}</p>)}<b>Estimación técnica: {Number(data.inspection.report.estimateCLP).toLocaleString('es-CL',{style:'currency',currency:'CLP'})}</b><p className="mut">Antecedente técnico, no una instrucción de pago.</p></>}</div>}<p>La mediación terminó sin acuerdo. Una evaluación independiente puede determinar el estado de los trabajos, las reparaciones o partidas pendientes y su costo estimado.</p>
 <SignedDisputeReminder reminder={data.contractReminder}/>
 {data.claim.mode==='direct'?<><p className="mut">Contratación directa: la inspección es voluntaria. Se debe buscar un profesional independiente, cotizar el alcance y los honorarios y aceptar el precio antes de contratar. El solicitante acuerda los honorarios y paga directamente al inspector fuera de MATCHTER, salvo acuerdo distinto entre las partes. Los precios y la coordinación quedan en su conversación privada. El informe se comparte en el expediente; no ordena descuentos ni movimientos de fondos.</p>
 {data.inspectionRequested.length>0&&<p role="status">Solicitud registrada por: {data.inspectionRequested.map(x=>roles[x]).join(', ')}. Consulta el estado de la cotización y contratación en el panel de inspección.</p>}
 {client?.qaReadOnly!==true&&!mediator&&!data.inspectionRequested.includes(side)&&<button type="button" className="btn out" disabled={busy||!inspectionsEnabled} onClick={()=>act('inspection','Consulta de inspección técnica independiente.')}>Buscar inspectores técnicos</button>}{inspectionsEnabled&&!mediator&&<InspectionCasePanel key={claimId} client={client} role={role} claimId={claimId} requested={data.inspectionRequested.includes(side)}/>}</>:<p className="mut">La contratación protegida y su procedimiento pericial todavía no están habilitados. Consulta las condiciones del documento original; no se aplican nuevas obligaciones a este contrato.</p>}
 </div></details>}

 {data.inspectionResolution&&<InspectionResolutionPanel state={data.inspectionResolution} side={side} busy={busy} onAct={act} readOnly={client?.qaReadOnly===true}/>}
 <InspectionAttachments key={'claim:'+claimId} client={client} role={role} claimId={claimId} mediator={mediator} canUpload={!mediator&&data.status!=='closed_with_agreement'&&!data.inspectionResolution?.status.startsWith('closed')}/>
 <details className="mr-accordion"><summary>Historial del expediente ({data.events.length})</summary><div>{data.events.map(e=><div className="ct-fee-summary" key={e.id}><b>{actions[e.action]} · {roles[e.side]}</b><small style={{display:'block'}}>{new Date(e.recordedAt).toLocaleString('es-CL')}</small>{e.text&&<p>{e.text}</p>}</div>)}</div></details><details className="mr-accordion"><summary>Documentación y descargas</summary><div><button className="btn out" disabled={busy} onClick={()=>exportRecord('json')}>Descargar expediente JSON</button>{completionEnabled&&<><button className="btn out" disabled={busy} onClick={()=>exportRecord('pdf')}>Descargar expediente PDF</button><button className="btn out" disabled={busy} onClick={()=>exportRecord('zip')}>Descargar PDF y evidencias originales (ZIP)</button></>}<p className="mut">Incluye el registro, acuerdo, contrato original de prueba y, si existe, el registro e informe textual de inspección en JSON. El PDF incluye el índice de archivos. La descarga ZIP reúne el PDF, el registro y los originales verificados; no incluye chats ni honorarios privados.</p></div></details></>}
 </section>
}
export function MediationAdminCenter({client,onBack}){
 const [cases,setCases]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState('')
 useEffect(()=>{let alive=true;adminRequest(client).then(r=>{if(alive)setCases(r.cases)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[client])
 if(selected)return <MediationPanel key={selected} client={client} mediator claimId={selected} onBack={()=>setSelected(null)}/>
 return <section className="mr mr-staff"><div className="mr-header"><button type="button" onClick={onBack}>‹ Volver</button><b>Administración</b></div><h1>Mediación</h1><p className="mr-muted">Consulta los expedientes y las gestiones registradas.</p>{error&&<p role="alert">{error}</p>}{cases.length===0&&!error&&<p className="mr-muted">Sin expedientes cargados.</p>}{cases.map(c=><article key={c.id} className="mr-card"><small className="mr-code">REC-{String(c.id).toUpperCase()}</small><div className="ms-card-head"><span className="ms-symbol" aria-hidden="true">§</span><div><b>{c.projectTitle}</b><small>Etapa {c.stageNo} · {new Date(c.createdAt).toLocaleDateString("es-CL")}</small></div></div><button type="button" className="mr-btn navy" onClick={()=>setSelected(c.id)}>Ver expediente</button></article>)}</section>
}
