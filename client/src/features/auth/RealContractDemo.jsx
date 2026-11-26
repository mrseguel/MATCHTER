import React,{useEffect,useRef,useState} from 'react'
import {FileText,ShieldCheck,CheckCircle2,PenLine} from 'lucide-react'
import {ContractDocument} from '../contracts/ContractFormal.jsx'
import {messagesRequest} from './messagesApi.js'
const options=[['simple','Firmar contrato simple','Simulación de firma de ambas partes. Sin notaría.'],['notary','Firmar y autorizar ante notario','Simulación de firma; autorización notarial no disponible.']]
export function RealContractDemo({context,agreement}){
 const {client,role,requestId}=context,side=role==='Cliente'?'client':'provider'
 const [contract,setContract]=useState(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [accepted,setAccepted]=useState(false),[front,setFront]=useState(false),[back,setBack]=useState(false),[drawn,setDrawn]=useState(false)
 const alive=useRef(false),seq=useRef(0),saving=useRef(false),loading=useRef(false),cv=useRef(null),drawing=useRef(false)
 const clear=()=>{cv.current?.getContext('2d')?.clearRect(0,0,600,200);setDrawn(false)}
 useEffect(()=>{setAccepted(false);setFront(false);setBack(false);clear()},[contract?.digest])
 async function load(){
  if(loading.current||saving.current)return
  loading.current=true;const ticket=++seq.current
  try{const r=await messagesRequest(client,'contract',role,undefined,{requestId})
   if(r.agreementVersion!==agreement.version)throw Error('El acuerdo cambió. Vuelve a abrir el documento.')
   if(alive.current&&ticket===seq.current){setContract(r.contract);setLoaded(true);setError('')}
  }catch(e){if(alive.current&&ticket===seq.current)setError(e.message)}
  finally{loading.current=false}
 }
 useEffect(()=>{alive.current=true;load();const timer=setInterval(load,8000);return()=>{alive.current=false;++seq.current;clearInterval(timer)}},[client,role,requestId,agreement.version])
 async function save(action,extra){
  if(saving.current)return
  saving.current=true;++seq.current;setBusy(true);setError('')
  try{const r=await messagesRequest(client,'contract',role,{requestId,action,agreementVersion:agreement.version,expectedRevision:contract?.revision||0,...extra})
   if(alive.current){setContract(r.contract);setLoaded(true)}
  }catch(e){if(alive.current)setError(e.message)}
  finally{saving.current=false;if(alive.current)setBusy(false)}
 }
 const locked=!!(contract?.confirmed?.client||contract?.confirmed?.provider),complete=!!(contract?.confirmed?.client&&contract?.confirmed?.provider)
 const terms=contract?.terms,job={id:requestId+'-v'+(contract?.revision||0),project:agreement.data.title,paid:0,formal:contract?{mode:contract.mode,terms,signatures:Object.fromEntries(Object.entries(contract.confirmed).filter(([,v])=>v).map(([k,v])=>[k,{at:v}])),notary:false}:undefined}
 const pos=e=>{const r=cv.current.getBoundingClientRect();return [(e.clientX-r.left)*600/r.width,(e.clientY-r.top)*200/r.height]}
 return <div className="card ct-sign"><div className="row sp"><h3><ShieldCheck size={21}/> Respaldo del acuerdo</h3><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button></div>
 <p className="mut">Beta de prueba · acuerdo versión {agreement.version}. El contrato escrito es obligatorio. No constituye firma legal, autorización notarial ni orden de pago. Usa exclusivamente antecedentes y trazos ficticios.</p>
 {!loaded?<p className="mut">Cargando documento…</p>:<>
 {!locked&&<div className="ct-options">{options.map(([mode,title,desc])=><button type="button" className={'ct-option '+(contract?.mode===mode?'selected':'')} disabled={busy} key={mode} onClick={()=>save('choose',{mode})}><FileText size={20}/><span><b>{title}</b><small>{desc}</small></span>{contract?.mode===mode&&<CheckCircle2 size={19}/>}</button>)}</div>}
 {contract&&<><div className="tag">Documento versión {contract.revision} · {options.find(o=>o[0]===contract.mode)?.[1]}</div>
 <ContractDocument job={job} client={{name:terms.client}} provider={{name:terms.provider}} stages={agreement.data.stages}/>
 {['client','provider'].map(k=><div className="ct-status" key={k}><CheckCircle2 size={19} color={contract.confirmed[k]?'#16934a':'#a5a5a5'}/><span>{k==='client'?'Cliente':'Prestador'}</span><b>{contract.confirmed[k]?'Confirmado · demo':'Pendiente'}</b></div>)}
 {!contract.confirmed[side]&&<div className="ct-form">
 <h4>Identidad y firma de prueba</h4><p className="mut">No subas documentos ni dibujes tu firma real. El trazo ficticio permanece en el navegador; solo se registra la confirmación de prueba.</p><div className="ct-actions"><button type="button" className="btn out" disabled={busy} onClick={()=>setFront(true)}>{front?'✓ Anverso de prueba':'Cédula demo · anverso'}</button><button type="button" className="btn out" disabled={busy} onClick={()=>setBack(true)}>{back?'✓ Reverso de prueba':'Cédula demo · reverso'}</button></div><div className="row sp"><b>Trazo ficticio</b><button type="button" className="chip" onClick={clear}>Limpiar</button></div><canvas ref={cv} className="ct-canvas" width="600" height="200" onPointerDown={e=>{if(busy)return;drawing.current=true;const c=cv.current.getContext('2d');c.lineWidth=3;c.strokeStyle='#142c60';c.lineCap='round';c.beginPath();c.moveTo(...pos(e));e.currentTarget.setPointerCapture?.(e.pointerId)}} onPointerMove={e=>{if(!drawing.current)return;const c=cv.current.getContext('2d');c.lineTo(...pos(e));c.stroke();setDrawn(true)}} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/>
 <label className="ct-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> He revisado el documento y acepto simular mi firma, sin efectos legales.</label>
 <button type="button" className="btn" disabled={busy||!accepted||!front||!back||!drawn} onClick={()=>save('confirm',{digest:contract.digest,accepted:true,identityDemo:true})}><PenLine size={17}/> Firmar contrato · demo</button></div>}
 {complete&&<div className="ct-success"><CheckCircle2 size={20}/>{contract.mode==='notary'?'Ambas firmas de prueba registradas · notaría pendiente':'Ambas firmas de prueba registradas'}</div>}
 <p className="mut">Referencia de integridad: {contract.digest.slice(0,16)}… · no se habilitan pagos.</p></>}
 </>}{error&&<p role="alert" className="wf-error">{error}</p>}</div>
}
