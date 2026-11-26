import React,{useEffect,useRef,useState} from 'react'
import {CheckCircle2,Lock,Clock3} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
function StageCard({stage:t,currentStage,complete}){
 const locked=!complete&&!t.fundedAt&&t.stageNo>currentStage
 const paid=!!t.fundedAt,delivered=!!t.deliveredAt,released=!!t.releasedAt
 const label=released?'Etapa finalizada · Pago liberado':paid?'Depósito registrado':locked?'Pendiente de etapa anterior':'Pendiente de depósito'
 const detail=released?'Recepción conforme · pago simulado':delivered?'Entrega notificada · pendiente de conformidad':paid?'En ejecución · pendiente de entrega':null
 const Icon=paid?CheckCircle2:locked?Lock:Clock3
 return <div className="wf-stage" data-stage-state={released?'released':delivered?'delivered':paid?'funded':locked?'locked':'pending'} style={paid?{border:'1px solid #b7dfc5',borderLeft:'3px solid #16934a',borderRadius:10,padding:'10px 9px',margin:'6px 0'}:undefined}>
 <div style={{display:'flex',alignItems:'flex-start',gap:8,minWidth:0}}>
 <Icon size={21} color={paid?'#16934a':'#9299a4'} aria-hidden="true" style={{flexShrink:0,marginTop:1}}/>
 <div><b>Etapa {t.stageNo} · {t.title}</b><small>{t.date}</small><small style={{fontWeight:600,...(paid?{color:'#16803c'}:{})}}>{label}</small>{detail&&<small>{detail}</small>}</div>
 </div><b style={{whiteSpace:'nowrap',flexShrink:0}}>{clp(t.amount)}</b></div>
}
function ExecutionProgress({stages}){
 const total=stages.length,started=stages.filter(t=>t.fundedAt).length
 const delivered=total>0&&stages.every(t=>t.deliveredAt)
 const green='#16934a',gray='#a5aab4',circumference=2*Math.PI*7
 const label='Ejecución de obra · '+started+' de '+total
 return <div title="Etapas con depósito registrado; el tick definitivo indica todas las entregas notificadas.">
 {delivered?<CheckCircle2 size={18} color={green} aria-hidden="true"/>:<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{flexShrink:0}}>
 <circle cx="9" cy="9" r="7" fill="none" stroke={gray} strokeWidth="1.6"/>
 {started>0&&total>0&&<circle cx="9" cy="9" r="7" fill="none" stroke={green} strokeWidth="1.8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-started/total)} transform="rotate(-90 9 9)"/>}
 <text x="9" y="9" dy=".35em" textAnchor="middle" fontSize="9" fontWeight="700" fill={started>0?green:gray}>{started}</text>
 </svg>}<span>{label}</span></div>
}
export function RealStageDemo({context,contract,onAdvance}){
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
   if(alive.current){setState(r);setAccepted(false);onAdvance?.()}
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
 {s.fundedAt&&!s.deliveredAt&&(side==='provider'?<button type="button" className="btn" disabled={busy} onClick={()=>save('deliver',s)}>Notificar entrega de etapa {s.stageNo}</button>:<p className="mut">Depósito de prueba registrado. Esperando entrega del prestador.</p>)}
 {s.deliveredAt&&(side==='client'?<><label className="wf-confirm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> {s.stageNo===state.stages.length?'Recibí conforme el trabajo completo, según el contrato.':'Verifiqué la etapa y recibí conforme los trabajos acordados.'}</label><button type="button" className="btn gr" disabled={busy||!accepted} onClick={()=>save('release',s)}>{s.stageNo===state.stages.length?'Recepción final y liberar último pago':'Confirmar conformidad y liberar pago'} · demo</button></>:<p className="mut">Entrega notificada; esperando conformidad del cliente.</p>)}
 </>}</>}
 {error&&<p className="wf-error" role="alert">{error}</p>}</section>
}
