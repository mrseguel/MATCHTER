import React,{useEffect,useRef,useState} from 'react'
import {messagesRequest} from './messagesApi.js'
import {RealContractDemo} from './RealContractDemo.jsx'
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
const blank=project=>({title:project||'',scope:'',start:'',end:'',stages:[['','',''],['','',''],['','','']]})
const ready=a=>!!(a?.confirmed?.client&&a?.confirmed?.provider)
const version=a=>a?.version||0
const fromAgreement=(a,project)=>a?{...a.data,stages:a.data.stages.map(s=>[...s])}:blank(project)
export function RealProjectAgreement({context,project,onAdvance,standalone=false}){
 const {client,role,requestId}=context
 const side=role==='Cliente'?'client':'provider'
 const [agreement,setAgreement]=useState(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[edit,setEdit]=useState(null),[showContract,setShowContract]=useState(false)
 const alive=useRef(false),seq=useRef(0),saving=useRef(false),loading=useRef(false)
 const query={requestId}
 async function load(){
  if(loading.current||saving.current)return
  loading.current=true
  const ticket=++seq.current
  try{const r=await messagesRequest(client,'agreement',role,undefined,query)
   if(alive.current&&ticket===seq.current){setAgreement(r.agreement);setLoaded(true);setError('')}
  }catch(e){if(alive.current&&ticket===seq.current)setError(e.message)}
  finally{loading.current=false}
 }
 useEffect(()=>{alive.current=true;load();const timer=setInterval(load,8000);return()=>{alive.current=false;++seq.current;clearInterval(timer)}},[client,role,requestId])
 const openEdit=()=>setEdit({expectedVersion:version(agreement),data:fromAgreement(agreement,project)})
 const field=(k,v)=>setEdit(old=>({...old,data:{...old.data,[k]:v}}))
 const stage=(i,k,v)=>setEdit(old=>({...old,data:{...old.data,stages:old.data.stages.map((s,j)=>i===j?s.map((x,n)=>k===n?v:x):s)}}))
 async function save(action,expectedVersion,data){
  if(saving.current)return
  saving.current=true;++seq.current;setBusy(true);setError('')
  try{const r=await messagesRequest(client,'agreement',role,{requestId,action,expectedVersion,...(data?{data}:{})})
   if(alive.current){setAgreement(r.agreement);setEdit(null);setLoaded(true);onAdvance?.()}
  }catch(e){if(alive.current){setError(e.message)}}
  finally{saving.current=false;if(alive.current)setBusy(false)}
 }
 const stale=edit&&edit.expectedVersion!==version(agreement)
 return <section className="wf-agreement" aria-label="Acuerdo previo al contrato">
  <div className="row sp"><h4>Acuerdo previo al contrato</h4><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button></div>
  <p className="mut">Esta etapa registra los antecedentes que ambas partes aprueban para preparar el contrato. No firma un contrato ni autoriza pagos.</p>
  {!loaded?<p className="mut">Cargando acuerdo…</p>:edit?<form className="wf-form" onSubmit={e=>{e.preventDefault();if(stale||busy)return;const data={...edit.data,stages:edit.data.stages.map(s=>[s[0],s[1],Number(s[2])])};save('propose',edit.expectedVersion,data)}}>
   <h4>Datos acordados tras la visita</h4>
   <label>Proyecto<input required minLength={3} maxLength={150} value={edit.data.title} onChange={e=>field('title',e.target.value)}/></label>
   <label>Alcance y especificaciones<textarea required minLength={20} maxLength={1800} rows={4} value={edit.data.scope} onChange={e=>field('scope',e.target.value)}/></label>
   <div className="wf-dates"><label>Inicio<input required type="date" value={edit.data.start} onChange={e=>field('start',e.target.value)}/></label><label>Término<input required type="date" min={edit.data.start||undefined} value={edit.data.end} onChange={e=>field('end',e.target.value)}/></label></div>
   {edit.data.stages.map((s,i)=><fieldset key={i}><legend>Etapa {i+1}</legend><label>Trabajo a entregar<input required maxLength={200} value={s[0]} onChange={e=>stage(i,0,e.target.value)}/></label><div className="wf-dates"><label>Fecha<input required type="date" min={edit.data.start||undefined} max={edit.data.end||undefined} value={s[1]} onChange={e=>stage(i,1,e.target.value)}/></label><label>Monto CLP<input required type="number" min="1" max="100000000000" step="1" value={s[2]} onChange={e=>stage(i,2,e.target.value)}/></label></div></fieldset>)}
   <b>Total propuesto: {clp(edit.data.stages.reduce((sum,s)=>sum+(Number(s[2])||0),0))}</b>
   <p className="mut">Al enviar esta propuesta confirmas estos antecedentes. La otra parte debe revisar y confirmar la misma versión.</p>
   {stale&&<p className="wf-error" role="alert">La otra parte cambió la propuesta. Vuelve a revisar la última versión antes de enviar ajustes.</p>}
   <button className="btn" disabled={busy||stale||ready(agreement)}>{busy?'Guardando…':'Proponer y confirmar acuerdo'}</button>
   <button type="button" className="btn out" disabled={busy} onClick={()=>setEdit(null)}>Volver al acuerdo</button>
  </form>:agreement?<><b>Acuerdo propuesto · versión {agreement.version}</b><p>{agreement.data.title}</p><p className="mut" style={{whiteSpace:'pre-wrap'}}>{agreement.data.scope}</p><p>{agreement.data.start} — {agreement.data.end}</p>
  {agreement.data.stages.map((s,i)=><div className="row sp" key={i}><span>{s[0]} · {s[1]}</span><b>{clp(s[2])}</b></div>)}
  <p><b>Total: {clp(agreement.data.stages.reduce((sum,s)=>sum+s[2],0))}</b></p>
  <div className="wf-status">{['client','provider'].map(k=><span key={k}>{k==='client'?'Cliente':'Prestador'}: {agreement.confirmed[k]?'✓ Conforme':'Pendiente'}</span>)}</div>
  {ready(agreement)?<><p className="mut" role="status">✓ Ambas partes confirmaron esta versión.</p>{!standalone&&<><button type="button" className="btn" onClick={()=>setShowContract(v=>!v)}>{showContract?'Cerrar documento':'Leer y firmar contrato'}</button>{showContract&&<RealContractDemo key={agreement.version} context={context} agreement={agreement}/>}</>}</>:<>
  {!agreement.confirmed[side]&&<button type="button" className="btn" disabled={busy} onClick={()=>save('confirm',agreement.version)}>Confirmar que acordamos trabajar juntos</button>}
  <button type="button" className="btn out" disabled={busy} onClick={openEdit}>Proponer ajustes al acuerdo</button><p className="mut">Una propuesta nueva requiere confirmación de ambas partes.</p></>}</>:<><p className="mut">Todavía no hay una propuesta registrada.</p><button type="button" className="btn" onClick={openEdit}>Preparar propuesta</button></>}
  {error&&<p className="wf-error" role="alert">{error}</p>}
 </section>
}
