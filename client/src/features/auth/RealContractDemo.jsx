import React,{useEffect,useId,useRef,useState} from 'react'
import {FileText,ShieldCheck,CheckCircle2,PenLine,Info,X} from 'lucide-react'
import {ContractDocument} from '../contracts/ContractFormal.jsx'
import {messagesRequest} from './messagesApi.js'
import {RealStageDemo} from './RealStageDemo.jsx'
const economicAmountStyle={display:'block',fontSize:22,fontWeight:700,lineHeight:'1.2',fontFamily:'inherit',fontVariantNumeric:'tabular-nums',WebkitTextSizeAdjust:'100%',textSizeAdjust:'100%',color:'var(--tx)'}
const feeButtonStyle={padding:'9px 14px',fontSize:13,minHeight:40,lineHeight:1.3}
const options=[['simple','Firmar contrato simple','Firma simple · sin costo notarial.'],['notary','Firmar y autorizar ante notario','Solo por acuerdo mutuo. El costo se acuerda entre las partes.']]
function FeeInformation({bilateral,amount}){
 const id=useId(),anchor=useRef(null),trigger=useRef(null),lastHint=useRef(0),timer=useRef(null)
 const [hint,setHint]=useState(false),[hover,setHover]=useState(false),[pinned,setPinned]=useState(false),[room,setRoom]=useState(0)
 const open=hover||pinned
 useEffect(()=>{
  const measure=()=>{if(anchor.current&&trigger.current)setRoom(Math.max(0,Math.floor(anchor.current.getBoundingClientRect().right-trigger.current.getBoundingClientRect().right-8)))}
  measure()
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null
  if(anchor.current)observer?.observe(anchor.current)
  if(trigger.current)observer?.observe(trigger.current)
  window.addEventListener('resize',measure)
  return ()=>{observer?.disconnect();window.removeEventListener('resize',measure)}
 },[])
 useEffect(()=>{
  const node=anchor.current
  if(!node||typeof IntersectionObserver==='undefined')return
  const observer=new IntersectionObserver(([entry])=>{
   clearTimeout(timer.current)
   if(!entry.isIntersecting){setHint(false);setHover(false);setPinned(false);return}
   const now=Date.now()
   if(now-lastHint.current<6000)return
   lastHint.current=now;setHint(true);timer.current=setTimeout(()=>setHint(false),4000)
  },{threshold:0.6})
  observer.observe(node)
  return ()=>{observer.disconnect();clearTimeout(timer.current)}
 },[])
 useEffect(()=>{
  if(!open)return
  setHint(false)
  const outside=e=>{if(!anchor.current?.contains(e.target)){setPinned(false);setHover(false)}}
  const escape=e=>{if(e.key==='Escape'){setPinned(false);setHover(false);trigger.current?.focus()}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)
  return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[open])
 const dismiss=()=>{setPinned(false);setHover(false);setHint(false)}
 return <div ref={anchor} style={{position:'relative',display:'flex',flexWrap:'wrap',alignItems:'center',gap:5,minWidth:0}} onPointerLeave={e=>{if(e.pointerType==='mouse')setHover(false)}}>
  <span style={{display:'inline-flex',alignItems:'center',gap:5,flexShrink:0,maxWidth:'100%'}}><span className="mut" style={{margin:0,lineHeight:1.3}}>Tarifa de servicio MATCHTER</span>
  <button ref={trigger} type="button" aria-label="Conoce qué incluye tu tarifa" aria-expanded={open} aria-controls={id} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',background:'transparent',color:'#e87922',padding:3,border:0,cursor:'pointer',flexShrink:0}} onPointerEnter={e=>{if(e.pointerType==='mouse'){setHover(true);setHint(false)}}} onClick={()=>{if(pinned)dismiss();else{setPinned(true);setHint(false)}}}><Info size={19}/></button></span>
  {hint&&!open&&<span aria-hidden="true" style={{position:'relative',display:'inline-block',maxWidth:'100%',background:'#fff4e9',color:'#9a4b10',border:'1px solid #f4bf91',borderRadius:8,padding:'4px 8px',fontSize:11,fontWeight:600,boxShadow:'0 3px 12px #0002',pointerEvents:'none'}}>Conoce qué incluye tu tarifa</span>}
  {open&&<div id={id} role="region" aria-label="Detalle de tarifa MATCHTER" style={{...(room>=260?{position:'absolute',top:0,right:0,zIndex:30,width:Math.min(room,340)}:{position:'relative',flexBasis:'100%',width:'100%'}),maxWidth:340,boxSizing:'border-box',background:'var(--card,#fff)',color:'var(--tx,#202124)',border:'1px solid #e87922',borderRadius:12,padding:12,boxShadow:'0 6px 20px #0003',fontSize:13,lineHeight:1.45}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><b>¿Qué incluye tu tarifa?</b><button type="button" aria-label="Cerrar detalle" style={{background:'transparent',color:'inherit',border:0,padding:3,cursor:'pointer'}} onClick={dismiss}><X size={17}/></button></div>
   <p style={{margin:'6px 0'}}>La tarifa remunera la conexión, los acuerdos, la gestión documental y la formalización del contrato.</p>
   <p style={{margin:'6px 0'}}>El seguimiento, la coordinación de pagos y la mediación son prestaciones complementarias incluidas sin costo adicional de gestión, según disponibilidad.</p>
   {bilateral&&<p style={{margin:'6px 0'}}>Cada parte paga su propia tarifa de {amount}, una sola vez por contrato.</p>}
   <button type="button" className="chip" style={{marginTop:4}} onClick={dismiss}>Entendido</button>
  </div>}
 </div>
}
export function RealContractDemo({context,agreement,onAdvance,standalone=false,notaryOnly=false}){
 const {client,role,requestId}=context,side=role==='Cliente'?'client':'provider'
 const [upgrade,setUpgrade]=useState(false),[fee,setFee]=useState(null),[contract,setContract]=useState(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [proposeNotary,setProposeNotary]=useState(false),[payer,setPayer]=useState('')
 const [accepted,setAccepted]=useState(false),[front,setFront]=useState(false),[back,setBack]=useState(false),[selfie,setSelfie]=useState(false),[drawn,setDrawn]=useState(false)
 const alive=useRef(false),seq=useRef(0),saving=useRef(false),loading=useRef(false),cv=useRef(null),drawing=useRef(false)
 const clear=()=>{cv.current?.getContext('2d')?.clearRect(0,0,600,200);setDrawn(false)}
 useEffect(()=>{setAccepted(false);setFront(false);setBack(false);setSelfie(false);clear()},[contract?.digest])
 async function load(){
  if(loading.current||saving.current)return
  loading.current=true;const ticket=++seq.current
  try{const r=await messagesRequest(client,'contract',role,undefined,{requestId})
   if(r.agreementVersion!==agreement.version)throw Error('El acuerdo cambió. Vuelve a abrir el documento.')
   if(alive.current&&ticket===seq.current){setContract(r.contract);setUpgrade(r.feeUpgradeRequired===true);setFee(r.serviceFee||r.contract?.terms?.serviceFee||null);setLoaded(true);setError('')}
  }catch(e){if(alive.current&&ticket===seq.current)setError(e.message)}
  finally{loading.current=false}
 }
 useEffect(()=>{alive.current=true;load();const timer=setInterval(load,8000);return()=>{alive.current=false;++seq.current;clearInterval(timer)}},[client,role,requestId,agreement.version])
 async function save(action,extra){
  if(saving.current)return
  saving.current=true;++seq.current;setBusy(true);setError('')
  try{const r=await messagesRequest(client,'contract',role,{requestId,action,agreementVersion:agreement.version,expectedRevision:contract?.revision||0,...extra})
   if(alive.current){setContract(r.contract);setUpgrade(false);setFee(r.contract?.terms?.serviceFee||null);setLoaded(true);onAdvance?.()}
  }catch(e){if(alive.current)setError(e.message)}
  finally{saving.current=false;if(alive.current)setBusy(false)}
 }
 const locked=!!(contract?.confirmed?.client||contract?.confirmed?.provider),complete=!!(contract?.confirmed?.client&&contract?.confirmed?.provider)
 const arrangement=contract?.terms?.notaryArrangement,notaryReady=contract?.mode!=='notary'||!!(arrangement&&contract.notaryAcceptedAt)
 const terms=contract?.terms,job={id:requestId+'-v'+(contract?.revision||0),project:agreement.data.title,paid:0,formal:contract?{mode:contract.mode,terms,signatures:Object.fromEntries(Object.entries(contract.confirmed).filter(([,v])=>v).map(([k,v])=>[k,{at:v}])),notary:!!contract.notaryDemo?.authorizedAt,notaryAt:contract.notaryDemo?.authorizedAt}:undefined}
 const money=n=>Number(n).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
 const bilateral=fee?.version===2,providerPending=bilateral&&(!contract?.providerFeeMode||contract.providerFeeMode==='upfront'&&!contract.providerFeePaidAt)
 const feePending=!!fee&&(!contract?.serviceFeePaidAt||providerPending)
 const pos=e=>{const r=cv.current.getBoundingClientRect();return [(e.clientX-r.left)*600/r.width,(e.clientY-r.top)*200/r.height]}
 return <div className="card ct-sign"><div className="row sp"><h3><ShieldCheck size={21}/> Respaldo del acuerdo</h3><button type="button" className="chip" disabled={busy} onClick={load}>Actualizar</button></div>
 <p className="mut">Beta de prueba · acuerdo versión {agreement.version}. El contrato escrito es obligatorio. No constituye firma legal, autorización notarial ni orden de pago. Usa exclusivamente antecedentes y trazos ficticios.</p>
 {!loaded?<p className="mut">Cargando documento…</p>:<>
 {!notaryOnly&&fee&&<div className="ct-fee-summary ct-economic-summary" style={{display:'flex',flexDirection:'column',gap:8,padding:12}}><h4 style={{margin:0,lineHeight:1.3}}>Resumen económico del contrato</h4><div style={{padding:'6px 0',borderBottom:'1px solid #dce1e7',display:'grid',gap:2}}><span className="mut" style={{margin:0,lineHeight:1.3}}>Valor contractual total de la obra</span><span className="ct-economic-amount" style={economicAmountStyle}>{money(fee.contractTotal)}</span></div><div style={{padding:'0 0 6px',borderBottom:'1px solid #dce1e7',display:'grid',gap:2}}>{!bilateral&&side==='provider'?<span className="mut" style={{margin:0,lineHeight:1.3}}>Tarifa de servicio MATCHTER (cliente)</span>:<FeeInformation key={requestId+role} bilateral={bilateral} amount={money(fee.amount)}/>}<span className="ct-economic-amount" style={economicAmountStyle}>{money(fee.amount)}</span><span className="mut" style={{margin:0,lineHeight:1.3}}>Pago único e individual por contrato.</span></div><div style={{display:'grid',gap:2}}><span className="mut" style={{margin:0,lineHeight:1.3}}>{side==='client'?'Total obra + gestión':bilateral?'Ingreso de obra descontando tu tarifa':'Valor a recibir por la obra'}</span><b style={{fontSize:24,lineHeight:1.2,color:'#e87922'}}>{money(side==='client'?fee.combinedTotal:bilateral?fee.providerNet:fee.contractTotal)}</b></div><p style={{margin:0,color:'#b42318',fontSize:13,fontWeight:600,lineHeight:1.4}}>Una vez prestados los servicios de gestión y formalizado el contrato, el solo hecho de decidir no iniciar o continuar los trabajos contratados a través de MATCHTER no será causal de devolución de la tarifa de servicio. Consulta las condiciones de devolución del contrato.</p><p style={{margin:0,lineHeight:1.35,fontSize:13}}><b>No incluye eventuales costos notariales.</b></p><p className="mut" style={{margin:0,lineHeight:1.35}}>Simulación; no se realizan cobros reales.</p><div style={{display:'flex',flexDirection:'column',gap:12,marginTop:10,paddingTop:12,borderTop:'1px solid var(--line,#dce1e7)'}}>{upgrade?<p className="mut">Selecciona nuevamente la modalidad contractual para actualizar el borrador al modelo bilateral antes de firmar.</p>:<><div className="ct-status"><span>Pago de tarifa del cliente</span><b>{contract?.serviceFeePaidAt?'✓ Pagada · demo':'Pendiente'}</b></div>{complete&&side==='client'&&!contract?.serviceFeePaidAt&&<button type="button" className="btn" style={feeButtonStyle} disabled={busy} onClick={()=>{if(window.confirm('¿Registrar tu tarifa de prueba de '+money(fee.amount)+'? No habrá ningún cargo real.'))save('payServiceFeeDemo',{digest:contract.digest,accepted:true,demoAmount:fee.amount})}}>Simular pago tarifa MATCHTER · {money(fee.amount)}</button>}{bilateral&&<><div className="ct-status"><span>Pago de tarifa del {context.providerLabel||'perfil contratado'}</span><b>{contract?.providerFeePaidAt?'✓ Pagada · demo':contract?.providerFeeMode==='deferred'?'Descuento autorizado':'Pendiente'}</b></div>{contract?.providerFeeMode==='deferred'&&<p className="mut">El descuento se hará del primer pago por los trabajos. Si es menor que la tarifa, se aplicará al primer pago que permita cubrirla completa.</p>}{complete&&side==='provider'&&!contract?.providerFeeMode&&<div className="ct-actions" style={{gap:9,marginTop:4}}><button type="button" className="btn" style={feeButtonStyle} disabled={busy} onClick={()=>{if(window.confirm('¿Registrar tu tarifa de prueba de '+money(fee.amount)+' ahora? No habrá cargo real.'))save('payProviderFeeDemo',{digest:contract.digest,accepted:true,demoAmount:fee.amount})}}>Pagar ahora · {money(fee.amount)} · demo</button>{fee.deferAvailable?<button type="button" className="btn out" style={feeButtonStyle} disabled={busy} onClick={()=>{if(window.confirm('¿Autorizar el descuento de '+money(fee.amount)+' de tu primer pago por los trabajos? Si ese pago es menor que la tarifa, se descontará del primer pago que permita cubrirla completa. Solo simulación.'))save('deferProviderFeeDemo',{digest:contract.digest,accepted:true})}}>Descontar de mi primer pago</button>:<p className="mut">Ninguna etapa cubre la tarifa completa. Para este contrato solo está disponible el pago directo.</p>}{fee.deferAvailable&&<p className="mut" style={{flexBasis:'100%',margin:0}}>Si tu primer pago es menor que la tarifa, el descuento se hará en el primer pago que permita cubrirla completa.</p>}</div>}</>}{!complete&&<p className="mut">El pago de las tarifas se realiza una vez que ambas partes hayan firmado el contrato. {bilateral&&fee.deferAvailable?' El perfil contratado también puede optar por el descuento de su tarifa al recibir el pago de los trabajos.':''}</p>}</>}</div></div>}
 {!notaryOnly&&!locked&&<div className="ct-options">{options.map(([mode,title,desc])=><button type="button" className={'ct-option '+(contract?.mode===mode?'selected':'')} disabled={busy} key={mode} onClick={()=>{if(mode==='notary'){setPayer(arrangement?.payer||'');setProposeNotary(true)}else{setProposeNotary(false);save('choose',{mode})}}}><FileText size={20}/><span><b>{title}</b><small>{desc}</small></span>{contract?.mode===mode&&<CheckCircle2 size={19}/>}</button>)}</div>}
 {!notaryOnly&&proposeNotary&&!locked&&<form className="ct-form" onSubmit={e=>{e.preventDefault();if(!payer||busy)return;save('choose',{mode:'notary',payer});setProposeNotary(false)}}><h4>Proponer contrato notarial</h4><p className="mut">El pago se acuerda entre las partes. La contraparte deberá aceptar esta propuesta. El importe definitivo se informará antes de cualquier cobro; aquí no se realiza ningún pago.</p><label>¿Quién paga el costo total del trámite?<select required value={payer} onChange={e=>setPayer(e.target.value)}><option value="">Seleccionar responsable</option><option value="client">Cliente</option><option value="provider">{context.providerLabel||'Contraparte'}</option></select></label><button className="btn" disabled={busy||!payer}>Enviar propuesta notarial</button><button type="button" className="btn out" onClick={()=>setProposeNotary(false)}>Cancelar</button></form>}
 {contract&&!upgrade&&<><div className="tag">Documento versión {contract.revision} · {options.find(o=>o[0]===contract.mode)?.[1]}</div>
 {!notaryOnly&&contract.mode==='notary'&&<div className="ct-fee-summary"><b>Acuerdo del costo notarial</b><p>Responsable del costo total: {arrangement?.payer==='client'?'Cliente':arrangement?.payer==='provider'?(context.providerLabel||'Contraparte'):'Por definir'}</p><p className="mut">Tarifa pendiente de cotización · sin cobro en esta beta.</p><div className="wf-status"><span>Cliente: {arrangement&&(arrangement.proposedBy==='client'||contract.notaryAcceptedAt)?'✓ Conforme':'Pendiente'}</span><span>{context.providerLabel||'Contraparte'}: {arrangement&&(arrangement.proposedBy==='provider'||contract.notaryAcceptedAt)?'✓ Conforme':'Pendiente'}</span></div>{arrangement&&!contract.notaryAcceptedAt&&arrangement.proposedBy!==side&&<button type="button" className="btn" disabled={busy} onClick={()=>save('acceptNotary',{digest:contract.digest})}>Aceptar modalidad y responsable del pago</button>}{!notaryReady&&!locked&&<><p className="mut">{arrangement?.proposedBy===side?'Esperando aceptación de la contraparte.':'Se requiere acuerdo de ambas partes antes de firmar.'}</p><button type="button" className="btn out" disabled={busy} onClick={()=>{setProposeNotary(false);save('choose',{mode:'simple'})}}>Continuar con contrato simple · sin costo notarial</button></>}</div>}
 {!notaryOnly&&<><ContractDocument job={job} client={{name:terms.client}} provider={{name:terms.provider}} stages={agreement.data.stages}/>
 {['client','provider'].map(k=><div className="ct-status" key={k}><CheckCircle2 size={19} color={contract.confirmed[k]?'#16934a':'#a5a5a5'}/><span>{k==='client'?'Cliente':(context.providerLabel||'Contraparte')}</span><b>{contract.confirmed[k]?'Confirmado · demo':'Pendiente'}</b></div>)}
 {notaryReady&&!contract.confirmed[side]&&<div className="ct-form">
 <h4>Identidad y firma de prueba</h4><p className="mut">No subas documentos ni dibujes tu firma real. El trazo ficticio permanece en el navegador; solo se registra la confirmación de prueba.</p><div className="ct-actions"><button type="button" className="btn out" disabled={busy} onClick={()=>setFront(true)}>{front?'✓ Anverso de prueba':'Cédula demo · anverso'}</button><button type="button" className="btn out" disabled={busy} onClick={()=>setBack(true)}>{back?'✓ Reverso de prueba':'Cédula demo · reverso'}</button><button type="button" className="btn out" disabled={busy} onClick={()=>setSelfie(true)}>{selfie?'✓ Rostro y cédula de prueba':'Rostro junto al carnet · demo'}</button></div><p className="mut">Simula el anverso, reverso y una fotografía cercana del titular sosteniendo el carnet, con buena iluminación. No se captura ni verifica identidad real.</p><div className="row sp"><b>Firma electrónica simple</b><button type="button" className="chip" onClick={clear}>Limpiar</button></div><p className="mut">En la versión definitiva, procura que tu firma coincida con la de tu cédula de identidad. Para esta beta, dibuja exclusivamente una firma ficticia.</p><canvas ref={cv} className="ct-canvas" width="600" height="200" onPointerDown={e=>{if(busy)return;drawing.current=true;const c=cv.current.getContext('2d');c.lineWidth=3;c.strokeStyle='#142c60';c.lineCap='round';c.beginPath();c.moveTo(...pos(e));e.currentTarget.setPointerCapture?.(e.pointerId)}} onPointerMove={e=>{if(!drawing.current)return;const c=cv.current.getContext('2d');c.lineTo(...pos(e));c.stroke();setDrawn(true)}} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/>
 <label className="ct-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> He revisado el documento y acepto simular mi firma, sin efectos legales.</label>
 <button type="button" className="btn" disabled={busy||!accepted||!front||!back||!selfie||!drawn} onClick={()=>save('confirm',{digest:contract.digest,accepted:true,identityDemo:true,identityChecks:{front,back,selfie}})}><PenLine size={17}/> Firmar contrato · demo</button></div>}
 {complete&&<div className="ct-success"><CheckCircle2 size={20}/>Ambas firmas de prueba registradas</div>}</>}
 {(!standalone||notaryOnly)&&complete&&!feePending&&contract.mode==='notary'&&<div className="ct-fee-summary"><h4>Trámite notarial · simulación</h4><div className="row sp"><span>Responsable acordado</span><b>{arrangement?.payer==='client'?'Cliente':(context.providerLabel||'Contraparte')}</b></div><div className="row sp"><span>Importe ficticio del trámite</span><b>{Number(contract.notaryDemo?.fee||0).toLocaleString('es-CL',{style:'currency',currency:'CLP'})}</b></div><p className="mut">Monto exclusivamente ilustrativo. No es una tarifa real, no se solicitan tarjetas y no se moverá dinero.</p>{contract.notaryDemo?.paidAt?<div className="ct-success"><CheckCircle2 size={18}/>Pago simulado registrado</div>:side===arrangement?.payer?<button type="button" className="btn" disabled={busy} onClick={()=>{if(window.confirm('¿Registrar el pago ficticio del trámite notarial? No se realizará ningún cargo.'))save('payNotaryDemo',{digest:contract.digest,accepted:true,demoAmount:contract.notaryDemo.fee})}}>Simular pago del trámite notarial</button>:<p className="mut">Esperando el pago simulado del responsable acordado.</p>}{contract.notaryDemo?.authorizedAt?<div className="ct-success"><CheckCircle2 size={18}/>Autorización notarial simulada · sin validez legal</div>:contract.notaryDemo?.paidAt?<button type="button" className="btn out" disabled={busy} onClick={()=>{if(window.confirm('Esta acción solo simula una autorización. No representa intervención notarial real.'))save('authorizeNotaryDemo',{digest:contract.digest,accepted:true})}}>Simular autorización notarial</button>:<p className="mut">La autorización de prueba requiere el pago simulado previo.</p>}</div>}
 {!standalone&&complete&&!feePending&&(contract.mode==='simple'||contract.mode==='notary'&&contract.notaryDemo?.authorizedAt)&&<RealStageDemo key={contract.digest} context={context} contract={contract}/>}
 <p className="mut">Referencia de integridad: {contract.digest.slice(0,16)}… · no se habilitan pagos reales.</p></>}
 </>}{error&&<p role="alert" className="wf-error">{error}</p>}</div>
}
