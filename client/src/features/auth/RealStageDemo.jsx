import React,{useEffect,useRef,useState} from 'react'
import {CheckCircle2,Lock} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
const clp=n=>'$'+Number(n).toLocaleString('es-CL')+' CLP'
const status=s=>s.releasedAt?'Pago liberado · demo':s.deliveredAt?'Pendiente de conformidad':s.fundedAt?'En ejecución · depósito simulado':'Pendiente de depósito'
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
 <div className="wf-progress">{['Contrato formalizado · demo','Ejecución de obra','Recepción conforme'].map((x,i)=><div key={x}><CheckCircle2 size={18} color={i===0||i>0&&state.complete?'#16934a':'#a5aab4'}/><span>{x}</span></div>)}</div>
 {state.stages.map(t=><div className="wf-stage" key={t.stageNo}><div><b>Etapa {t.stageNo} · {t.title}</b><small>{t.date} · {t.stageNo>state.currentStage&&!state.complete?'Pendiente de etapa anterior':status(t)}</small></div><b>{clp(t.amount)}</b></div>)}
 <div className="row sp"><span>Total contractual</span><b>{clp(state.stages.reduce((n,t)=>n+t.amount,0))}</b></div>
 {state.complete?<div className="wf-done"><CheckCircle2 size={21}/> Proyecto recibido conforme · pagos de prueba liberados.</div>:s&&<>
 {!s.fundedAt&&(side==='client'?<button type="button" className="btn" disabled={busy} onClick={()=>save('fund',s)}>Simular depósito etapa {s.stageNo} · {clp(s.amount)}</button>:<p className="mut"><Lock size={15}/> Esperando depósito simulado del cliente.</p>)}
 {s.fundedAt&&!s.deliveredAt&&(side==='provider'?<button type="button" className="btn" disabled={busy} onClick={()=>save('deliver',s)}>Notificar entrega de etapa {s.stageNo}</button>:<p className="mut">Depósito de prueba registrado. Esperando entrega del prestador.</p>)}
 {s.deliveredAt&&(side==='client'?<><label className="wf-confirm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> {s.stageNo===state.stages.length?'Recibí conforme el trabajo completo, según el contrato.':'Verifiqué la etapa y recibí conforme los trabajos acordados.'}</label><button type="button" className="btn gr" disabled={busy||!accepted} onClick={()=>save('release',s)}>{s.stageNo===state.stages.length?'Recepción final y liberar último pago':'Confirmar conformidad y liberar pago'} · demo</button></>:<p className="mut">Entrega notificada; esperando conformidad del cliente.</p>)}
 </>}</>}
 {error&&<p className="wf-error" role="alert">{error}</p>}</section>
}
