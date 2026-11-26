import React,{useEffect,useRef,useState} from 'react'
import {CheckCircle2,Lock,Clock3} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
const dateCL=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.split('-').reverse().join('-'):d
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
function StageCard({stage:t,currentStage,complete}){
 const locked=!complete&&!t.fundedAt&&t.stageNo>currentStage
 const paid=!!t.fundedAt,delivered=!!t.deliveredAt,released=!!t.releasedAt
 const label=released?'Etapa finalizada · Pago liberado':paid?'Depósito registrado':locked?'Pendiente de etapa anterior':'Pendiente de depósito'
 const detail=released?'Recepción conforme · pago simulado':delivered?'Entrega notificada · pago pendiente de liberación':paid?'En ejecución · pendiente de entrega':null
 const Icon=released?CheckCircle2:locked?Lock:Clock3
 const color=released?'#16934a':paid?'#b77908':'#9299a4'
 return <div className="wf-stage" data-stage-state={released?'released':delivered?'delivered':paid?'funded':locked?'locked':'pending'} style={paid?{border:'1px solid '+(released?'#b7dfc5':'#e8cf83'),borderLeft:'3px solid '+color,borderRadius:10,padding:'10px 9px',margin:'6px 0'}:undefined}>
 <div style={{display:'flex',alignItems:'flex-start',gap:8,minWidth:0}}>
 <Icon size={21} color={color} aria-hidden="true" style={{flexShrink:0,marginTop:1}}/>
 <div><b>Etapa {t.stageNo} · {t.title}</b><small>Entrega: {dateCL(t.date)}{t.physicalPercent!=null?' · Avance físico de la etapa: '+Number(t.physicalPercent).toLocaleString('es-CL',{maximumFractionDigits:2})+' %':''}</small><small style={{fontWeight:600,...(paid?{color}:{})}}>{label}</small>{detail&&<small>{detail}</small>}</div>
 </div><b style={{whiteSpace:'nowrap',flexShrink:0}}>{clp(t.amount)}</b></div>
}
function ExecutionProgress({stages}){
 const total=stages.length,started=stages.filter(t=>t.fundedAt).length
 const delivered=total>0&&stages.every(t=>t.releasedAt)
 const active=stages.some(t=>t.fundedAt&&!t.releasedAt)
 const green='#16934a',gray='#a5aab4',circumference=2*Math.PI*7
 const ring=active?'#b77908':green
 const label='Ejecución de obra · '+started+' de '+total
 return <div title="Etapas con depósito registrado; Amarillo: etapa en curso. Verde: etapa aprobada y pago liberado.">
 {delivered?<CheckCircle2 size={18} color={green} aria-hidden="true"/>:<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{flexShrink:0}}>
 <circle cx="9" cy="9" r="7" fill="none" stroke={gray} strokeWidth="1.6"/>
 {started>0&&total>0&&<circle cx="9" cy="9" r="7" fill="none" stroke={ring} strokeWidth="1.8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-started/total)} transform="rotate(-90 9 9)"/>}
 <text x="9" y="9" dy=".35em" textAnchor="middle" fontSize="9" fontWeight="700" fill={started>0?ring:gray}>{started}</text>
 </svg>}<span>{label}</span></div>
}
export function RealStageDemo({context,contract,onAdvance,onComplete}){
 const {client,role,requestId}=context,side=role==='Cliente'?'client':'provider'
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[accepted,setAccepted]=useState(false)
 const alive=useRef(false),saving=useRef(false),loading=useRef(false),seq=useRef(0)
 async function load(){
  if(loading.current||saving.current)return
  loading.current=true;const ticket=++seq.current
  try{const r=await messagesRequest(client,'stages',role,undefined,{requestId})
   if(r.digest!==contract.digest)throw Error('El contrato cambió. Actualiza el documento.')
   if(alive.current&&ticket===seq.current)setState(r)
  }catch(e){if(alive.current&&ticket===seq.current)setError(e.message)}finally{loading.current=false}
 }
 useEffect(()=>{alive.current=true;load();const timer=setInterval(load,8000);return()=>{alive.current=false;++seq.current;clearInterval(timer)}},[client,role,requestId,contract.digest])
 useEffect(()=>setAccepted(false),[state?.currentStage])
 async function save(action,s){
  if(saving.current)return
  if(action==='fund'&&!window.confirm('¿Registrar depósito ficticio por '+clp(s.amount)+'? No se realizará ningún cargo.'))return
  saving.current=true;++seq.current;setBusy(true);setError('')
  try{const r=await messagesRequest(client,'stages',role,{requestId,action,agreementVersion:contract.agreementVersion,contractRevision:contract.revision,digest:contract.digest,stageNo:s.stageNo,accepted:true})
   if(alive.current){setState(r);setAccepted(false);onAdvance?.();if(action==='release'&&r.complete)onComplete?.()}
  }catch(e){if(alive.current)setError(e.message)}finally{saving.current=false;if(alive.current)setBusy(false)}
 }
 const s=state?.stages.find(x=>x.stageNo===state.currentStage)
 return <section className="card wf-execution" aria-label="Seguimiento del proyecto"><div className="row sp"><h3>Seguimiento del proyecto</h3><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button></div>
 <p className="mut">Pago protegido · simulación. No existe custodia ni transferencia de fondos reales. Los reclamos y la mediación todavía no están conectados a este flujo de prueba.</p>
 {!state?<p className="mut">Cargando hitos...</p>:<>
 <div className="wf-progress"><div><CheckCircle2 size={18} color="#16934a"/><span>Contrato formalizado · demo</span></div><ExecutionProgress stages={state.stages}/><div><CheckCircle2 size={18} color={state.complete?'#16934a':'#a5aab4'}/><span>Recepción conforme</span></div></div>
 {state.stages.map(t=><StageCard key={t.stageNo} stage={t} currentStage={state.currentStage} complete={state.complete}/>)}
 <div className="row sp"><span>Total contractual</span><b>{clp(state.stages.reduce((n,t)=>n+t.amount,0))}</b></div>
 {state.complete?<div className="wf-done"><CheckCircle2 size={21}/> Proyecto recibido conforme · pagos de prueba liberados.</div>:s&&<>
 {!s.fundedAt&&(side==='client'?<button type="button" className="btn" disabled={busy} onClick={()=>save('fund',s)}>Simular depósito etapa {s.stageNo} · {clp(s.amount)}</button>:<p className="mut"><Lock size={15}/> Esperando depósito simulado del cliente.</p>)}
 {s.fundedAt&&!s.deliveredAt&&(side==='provider'?<button type="button" className="btn" disabled={busy} onClick={()=>save('deliver',s)}>Notificar entrega de etapa {s.stageNo}</button>:<p className="mut">Depósito de prueba registrado. Esperando entrega de los trabajos.</p>)}
 {s.deliveredAt&&(side==='client'?<><label className="wf-confirm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> {s.stageNo===state.stages.length?'Recibí conforme el trabajo completo, según el contrato.':'Verifiqué la etapa y recibí conforme los trabajos acordados.'}</label><p className="mut">Al confirmar, autorizas la liberación simulada de {clp(s.amount)}. No se transferirá dinero real.</p><button type="button" className="btn gr" disabled={busy||!accepted} onClick={()=>save('release',s)}>Confirmar entrega de etapa {s.stageNo} y liberar pago · demo</button></>:<p className="mut">Entrega notificada. En el flujo definitivo, los fondos de esta etapa se liberarán a tu cuenta bancaria cuando el cliente confirme la recepción conforme de los trabajos. En esta beta, la liberación es simulada.</p>)}
 </>}</>}
 {error&&<p className="wf-error" role="alert">{error}</p>}</section>
}
