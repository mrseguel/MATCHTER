import React,{useEffect,useRef,useState} from 'react'
import {messagesRequest} from './messagesApi.js'
import {CheckCircle2} from 'lucide-react'
import {RealContractDemo} from './RealContractDemo.jsx'
const dateCL=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.split('-').reverse().join('-'):d
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
const blankStage=()=>['','','','']
const blank=project=>({title:project||'',scope:'',start:'',end:'',totalAmount:'',stages:[blankStage()]})
const percent=n=>Number(n).toLocaleString('es-CL',{maximumFractionDigits:2})+' %'
const ready=a=>!!(a?.confirmed?.client&&a?.confirmed?.provider)
const version=a=>a?.version||0
const fromAgreement=(a,project)=>a?{...a.data,totalAmount:a.data.totalAmount??a.data.stages.reduce((sum,s)=>sum+s[2],0),stages:a.data.stages.map(s=>[s[0],s[1],s[2],s[3]??''])}:blank(project)
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
 const addStage=()=>setEdit(old=>({...old,data:{...old.data,stages:[...old.data.stages,blankStage()]}}))
 const removeStage=i=>setEdit(old=>({...old,data:{...old.data,stages:old.data.stages.filter((_,j)=>j!==i)}}))
 const draft=edit?.data
 const payments=draft?.stages.reduce((sum,s)=>sum+(Number(s[2])||0),0)||0
 const physical=(draft?.stages.reduce((sum,s)=>sum+Math.round((Number(s[3])||0)*100),0)||0)/100
 const totalsOK=!!draft&&Number(draft.totalAmount)>0&&payments===Number(draft.totalAmount)&&physical===100
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
  {!loaded?<p className="mut">Cargando acuerdo…</p>:edit?<form className="wf-form" onSubmit={e=>{e.preventDefault();if(stale||busy||!totalsOK)return;const data={...edit.data,totalAmount:Number(edit.data.totalAmount),stages:edit.data.stages.map(s=>[s[0],s[1],Number(s[2]),Number(s[3])])};save('propose',edit.expectedVersion,data)}}>
   <h4>Datos acordados tras la visita</h4>
   <label>Proyecto<input required minLength={3} maxLength={150} value={edit.data.title} onChange={e=>field('title',e.target.value)}/></label>
   <label>Alcance y especificaciones (mínimo 20 caracteres)<textarea required minLength={20} maxLength={1800} rows={4} value={edit.data.scope} onChange={e=>field('scope',e.target.value)}/></label>
   <div className="wf-dates"><label>Inicio<input required type="date" value={edit.data.start} onChange={e=>field('start',e.target.value)}/></label><label>Término<input required type="date" min={edit.data.start||undefined} value={edit.data.end} onChange={e=>field('end',e.target.value)}/></label></div>
   <h4>Etapas, avance y pagos</h4>
   <p className="mut">Definan de común acuerdo cuántas etapas necesita el proyecto. Cada etapa corresponde a un pago. El porcentaje representa la parte de la obra a ejecutar en esa etapa, no necesariamente la proporción del precio.</p>
   <label>Valor total acordado (CLP)<input required type="number" min="1" max="5000000000000" step="1" value={edit.data.totalAmount} onChange={e=>field('totalAmount',e.target.value)}/></label>
   <div className="row sp"><b>{edit.data.stages.length} {edit.data.stages.length===1?'etapa · 1 pago':'etapas · '+edit.data.stages.length+' pagos'}</b><button type="button" className="chip" disabled={busy||edit.data.stages.length>=50} onClick={addStage}>+ Agregar etapa</button></div>
   {edit.data.stages.map((s,i)=><fieldset key={i}><legend>Etapa {i+1} de {edit.data.stages.length}</legend><label>Trabajo a entregar<input required maxLength={200} value={s[0]} onChange={e=>stage(i,0,e.target.value)}/></label><div className="wf-dates"><label>Fecha de entrega<input required type="date" min={edit.data.start||undefined} max={edit.data.end||undefined} value={s[1]} onChange={e=>stage(i,1,e.target.value)}/></label><label>Monto CLP<input required type="number" min="1" max="100000000000" step="1" value={s[2]} onChange={e=>stage(i,2,e.target.value)}/></label></div><label>Avance físico correspondiente a esta etapa (%)<input required type="number" min="0.01" max="100" step="0.01" value={s[3]} onChange={e=>stage(i,3,e.target.value)}/></label><button type="button" className="btn out" disabled={busy||edit.data.stages.length===1} onClick={()=>removeStage(i)}>Eliminar etapa {i+1}</button></fieldset>)}
   <button type="button" className="btn out" disabled={busy||edit.data.stages.length>=50} onClick={addStage}>+ Agregar otra etapa</button>
   <div className="card"><div className="row sp"><span>Avance físico total</span><b>{percent(physical)} de 100 %</b></div><div className="row sp"><span>Pagos distribuidos</span><b>{clp(payments)}</b></div><div className="row sp"><span>Valor total acordado</span><b>{clp(draft.totalAmount||0)}</b></div><p role="status" className="mut">{totalsOK?'✓ Los porcentajes y los pagos cuadran.':'El avance debe sumar 100 % y los pagos deben coincidir con el valor total acordado.'}</p></div>
   <p className="mut">Al enviar esta propuesta confirmas estos antecedentes. La otra parte debe revisar y confirmar la misma versión.</p>
   {stale&&<p className="wf-error" role="alert">La otra parte cambió la propuesta. Vuelve a revisar la última versión antes de enviar ajustes.</p>}
   <button className="btn" disabled={busy||stale||ready(agreement)||!totalsOK}>{busy?'Guardando…':'Proponer y confirmar acuerdo'}</button>
   <button type="button" className="btn out" disabled={busy} onClick={()=>setEdit(null)}>Volver al acuerdo</button>
  </form>:agreement?<><b>Acuerdo propuesto · versión {agreement.version}</b><p>{agreement.data.title}</p><p className="mut" style={{whiteSpace:'pre-wrap'}}>{agreement.data.scope}</p><p>{dateCL(agreement.data.start)} — {dateCL(agreement.data.end)}</p>
  {agreement.data.stages.map((s,i)=><div className="row sp" key={i}><span>Etapa {i+1} · {s[0]} · Entrega: {dateCL(s[1])}{s[3]!=null&&<> · Avance físico {percent(s[3])}</>}</span><b>{clp(s[2])}</b></div>)}
  <p><b>{agreement.data.stages.length} {agreement.data.stages.length===1?'etapa / 1 pago':'etapas / '+agreement.data.stages.length+' pagos'} · Total: {clp(agreement.data.stages.reduce((sum,s)=>sum+s[2],0))}</b></p>
  <div className="wf-status">{['client','provider'].map(k=><span key={k}>{k==='client'?'Cliente':context.providerLabel||'Contraparte'}: {agreement.confirmed[k]?<><CheckCircle2 size={15} color="#16934a" style={{verticalAlign:'middle'}}/> Conforme</>:'Pendiente'}</span>)}</div>
  {ready(agreement)?<><p className="mut" role="status"><CheckCircle2 size={16} color="#16934a" style={{verticalAlign:'middle'}}/> <CheckCircle2 size={16} color="#16934a" style={{verticalAlign:'middle'}}/> Ambas partes confirmaron esta versión.</p>{!standalone&&<><button type="button" className="btn" onClick={()=>setShowContract(v=>!v)}>{showContract?'Cerrar documento':'Leer y firmar contrato'}</button>{showContract&&<RealContractDemo key={agreement.version} context={context} agreement={agreement}/>}</>}</>:<>
  {!agreement.confirmed[side]&&<button type="button" className="btn" disabled={busy} onClick={()=>save('confirm',agreement.version)}>Confirmar que acordamos trabajar juntos</button>}
  <button type="button" className="btn out" disabled={busy} onClick={openEdit}>Proponer ajustes al acuerdo</button><p className="mut">Una propuesta nueva requiere confirmación de ambas partes.</p></>}</>:<><p className="mut">Todavía no hay una propuesta registrada.</p><button type="button" className="btn" onClick={openEdit}>Preparar propuesta</button></>}
  {error&&<p className="wf-error" role="alert">{error}</p>}
 </section>
}
