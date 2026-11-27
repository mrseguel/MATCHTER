import React,{useState} from 'react'
import {CheckCircle2,Clock3,Lock} from 'lucide-react'
const money=n=>Number(n).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
const dateCL=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.split('-').reverse().join('-'):d
const stamp=d=>d?new Date(d).toLocaleString('es-CL'):''
const labels={pending:'Pendiente de inicio',in_progress:'En ejecución',delivered:'Entrega notificada',accepted:'Etapa recibida conforme'}
function ProgressEntry({stage,busy,save}){
 const [value,setValue]=useState(String(stage.progressPercent))
 const n=Number(value),valid=value.trim()!==''&&Number.isFinite(n)&&n>stage.progressPercent&&n<=100&&Math.abs(n*100-Math.round(n*100))<1e-7
 return <div className="ct-form">
  <label>Avance de esta etapa (%)<input type="number" min={stage.progressPercent} max="100" step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></label>
  <button type="button" className="btn out" disabled={busy||!valid} onClick={()=>save('progress',stage,n)}>Registrar avance</button>
 </div>
}
export function DirectStagePanel({state,side,busy,save,accepted,setAccepted}){
 const s=state.stages.find(t=>t.stageNo===state.currentStage)
 const allWeighted=state.stages.every(t=>Number.isFinite(t.physicalPercent))
 const physical=allWeighted?state.stages.reduce((n,t)=>n+t.physicalPercent*t.progressPercent/100,0):null
 return <>
 <p className="mut">Sin resguardo de fondos. Los pagos de los trabajos se coordinan directamente entre las partes; los montos de obra son informativos.</p>
 <div className="wf-progress"><div><CheckCircle2 size={18} color="#16934a"/><span>Contrato formalizado · demo</span></div><div><Clock3 size={18}/><span>Etapas recibidas: {state.stages.filter(t=>t.acceptedAt).length} de {state.stages.length}</span></div><div><CheckCircle2 size={18} color={state.complete?'#16934a':'#a5aab4'}/><span>Recepción conforme</span></div></div>
 {physical!==null&&<div className="mut">Avance físico global informado: {physical.toLocaleString('es-CL',{maximumFractionDigits:2})} %</div>}
 {state.stages.map(t=>{const done=!!t.acceptedAt,locked=!state.complete&&t.stageNo>state.currentStage,Icon=done?CheckCircle2:locked?Lock:Clock3,color=done?'#16934a':t.startedAt?'#b77908':'#9299a4';return <div key={t.stageNo} className="wf-stage" style={{borderLeft:'3px solid '+color,padding:'10px 9px',margin:'6px 0'}}><div style={{display:'flex',gap:8,minWidth:0}}><Icon size={21} color={color} style={{flexShrink:0}}/><div><b>Etapa {t.stageNo} · {t.title}</b><small>Entrega prevista: {dateCL(t.date)}{t.physicalPercent!=null?' · Peso físico: '+t.physicalPercent+' %':''}</small><small style={{fontWeight:600,color}}>{locked?'Pendiente de etapa anterior':labels[t.status]}</small><small>Avance informado: {t.progressPercent} %</small>{t.startedAt&&<small>Inicio: {stamp(t.startedAt)}</small>}{t.deliveredAt&&<small>Entrega: {stamp(t.deliveredAt)}</small>}{t.acceptedAt&&<small>Recepción: {stamp(t.acceptedAt)}</small>}</div></div><b style={{whiteSpace:'nowrap'}}>{money(t.amount)}</b></div>})}
 <div className="row sp"><span>Total contractual · informativo</span><b>{money(state.stages.reduce((n,t)=>n+t.amount,0))}</b></div>
 {state.complete?<div className="wf-done"><CheckCircle2 size={21}/> Proyecto recibido conforme.</div>:s&&<>
 {!s.startedAt&&(side==='provider'?<button type="button" className="btn" disabled={busy} onClick={()=>save('start',s)}>Registrar inicio de etapa {s.stageNo}</button>:<p className="mut">Esperando inicio de los trabajos.</p>)}
 {s.startedAt&&!s.deliveredAt&&(side==='provider'?<><ProgressEntry key={s.stageNo+':'+s.progressPercent} stage={s} busy={busy} save={save}/><button type="button" className="btn" disabled={busy} onClick={()=>{if(window.confirm('¿Notificar la entrega completa de esta etapa?'))save('deliver',s)}}>Notificar entrega de etapa {s.stageNo}</button></>:<p className="mut">Trabajos en ejecución. Esperando la entrega de esta etapa.</p>)}
 {s.deliveredAt&&(side==='client'?<><label className="wf-confirm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Recibí conforme los trabajos acordados de esta etapa.</label><p className="mut">Esta confirmación registra la recepción de los trabajos; no autoriza ni realiza una transferencia de dinero.</p><button type="button" className="btn gr" disabled={busy||!accepted} onClick={()=>save('accept',s)}>Confirmar recepción de etapa {s.stageNo}</button></>:<p className="mut">Entrega notificada. Esperando recepción conforme del cliente.</p>)}
 </>}
 </>
}
