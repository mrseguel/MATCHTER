import React,{useEffect,useState,useRef} from 'react'
import {CreditCard,Clock,CheckCircle2,Receipt,RefreshCw,ChevronRight,Plus,ArrowLeft,LockKeyhole} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
const money=n=>Number(n).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
const labels={recorded_demo:'Pago de prueba registrado',pending_demo:'Pendiente',deferred_demo:'Autorizado, sin pago'}
const titles={service_fee:'Tarifa MATCHTER',notary_fee:'Trámite notarial'}
const filters=[['all','Todos'],['recorded_demo','Registrados'],['pending','Pendientes']]
export function RealWallet({client,role,onBack,onOpenContract}){
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState('all'),[reload,setReload]=useState(0),[receiptBusy,setReceiptBusy]=useState(null),[receiptError,setReceiptError]=useState(''),[view,setView]=useState('home'),[selectedId,setSelectedId]=useState(null)
 const running=useRef(false)
 useEffect(()=>{let alive=true;setBusy(true);setError('');messagesRequest(client,'wallet',role).then(r=>{if(alive){if(!r.demo||r.realPaymentsEnabled!==false||!Array.isArray(r.movements))throw Error('Historial no disponible');setState(r)}}).catch(e=>{if(alive){setState(null);setError(e.message)}}).finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[client,role,reload])
 async function downloadReceipt(movementId){
  if(running.current)return;running.current=true;setReceiptBusy(movementId);setReceiptError('')
  try{
   const receipt=await messagesRequest(client,'wallet/receipt',role,undefined,{movementId})
   if(receipt.demo!==true||receipt.realPayment!==false||receipt.taxDocument!==false||receipt.movement?.id!==movementId)throw Error('Comprobante no válido')
   const {saveWalletReceipt}=await import('./walletReceiptPdf.js')
   await saveWalletReceipt(receipt)
  }catch(e){setReceiptError(e.message)}finally{running.current=false;setReceiptBusy(null)}
 }
 const rows=state?.movements||[],recorded=rows.filter(r=>r.status==='recorded_demo'),pending=rows.filter(r=>r.status!=='recorded_demo'),selected=rows.find(r=>r.id===selectedId)
 const shown=filter==='all'?rows:filter==='pending'?pending:recorded
 function history(next='all'){setFilter(next);setView('history');setSelectedId(null)}
 function back(){if(selectedId){setSelectedId(null);setReceiptError('')}else if(view!=='home'){setView('home');setFilter('all')}else onBack()}
 const row=r=><article key={r.id} className="mw-movement"><button type="button" className="mw-row" onClick={()=>{setReceiptError('');setSelectedId(r.id)}}><span className="mw-icon">{r.status==='recorded_demo'?<Receipt size={21}/>:<Clock size={21}/>}</span><span className="mw-copy"><strong>{titles[r.kind]||'Tarifa de prueba'}</strong><small>{r.projectTitle}</small><small className={r.status==='recorded_demo'?'mw-ok':''}>{labels[r.status]||'Registro de prueba'}</small></span><span className="mw-end"><b>{money(r.amountCLP)}</b><ChevronRight size={16}/></span></button></article>
 return <section className="mw-wallet" aria-label="Wallet de prueba">
  <header className="mw-head"><button className="mw-back" type="button" onClick={back} aria-label="Volver"><ArrowLeft size={20}/></button><h2>{selectedId?'Detalle del movimiento':view==='methods'?'Medios de pago':view==='history'?'Movimientos':'Mi Wallet'}</h2><button className="mw-back" type="button" disabled={busy} onClick={()=>setReload(n=>n+1)} aria-label="Actualizar"><RefreshCw size={18}/></button></header>
  <p className="mw-demo">Modo de prueba · No hay cobros reales.</p>
  {busy&&<p role="status" className="mw-muted">Consultando movimientos…</p>}{error&&<p role="alert">{error}</p>}{receiptError&&<p role="alert">{receiptError}</p>}
  {selectedId?selected?<div className="mw-panel mw-detail"><span className="mw-icon mw-detail-icon">{selected.status==='recorded_demo'?<CheckCircle2 size={28}/>:<Clock size={28}/>}</span><strong className="mw-amount">{money(selected.amountCLP)}</strong><p>{labels[selected.status]}</p><div className="mw-detail-list"><div><small>Concepto</small><b>{titles[selected.kind]}</b></div><div><small>Proyecto</small><b>{selected.projectTitle}</b></div><div><small>Contrato</small><b>{selected.agreementVersion}.{selected.contractRevision}</b></div><div><small>Fecha del registro</small><b>{selected.recordedAt?new Date(selected.recordedAt).toLocaleString('es-CL'):'Sin pago registrado'}</b></div></div>{selected.status==='recorded_demo'&&<button className="mw-primary" type="button" disabled={!!receiptBusy} onClick={()=>downloadReceipt(selected.id)}>{receiptBusy===selected.id?'Preparando…':'Descargar comprobante de prueba'}</button>}<button className="mw-secondary" type="button" onClick={()=>onOpenContract(selected.requestId)}>{selected.status==='recorded_demo'?'Ver contrato':'Ir al contrato'}</button></div>:<p className="mw-muted">Movimiento no disponible.</p>:view==='methods'?<div className="mw-panel"><div className="mw-empty"><span className="mw-icon"><CreditCard size={26}/></span><strong>Aún no tienes tarjetas registradas</strong><p>La vinculación estará disponible al conectar la pasarela de pagos.</p></div><button type="button" className="mw-primary" disabled><Plus size={19}/> Agregar tarjeta</button><p className="mw-security"><LockKeyhole size={15}/> No ingreses datos bancarios en esta beta.</p></div>:view==='history'?<>
  <div className="mw-filters" aria-label="Filtrar movimientos">{filters.map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
  {state&&!busy&&!shown.length&&<p className="mw-muted">No hay movimientos en esta sección.</p>}
  <div className="mw-panel mw-list">{shown.map(row)}</div>
  {state?.hasMore&&<p className="mw-muted">Se muestran hasta los 100 contratos firmados más recientes.</p>}
 </>:<>
  <div className="mw-panel mw-pending"><span className="mw-eyebrow">Pagos pendientes</span>{state?<><strong className="mw-amount">{pending.length?money(pending.reduce((total,r)=>total+r.amountCLP,0)):'Al día'}</strong><p className="mw-muted">{pending.length?pending.length+' movimiento'+(pending.length===1?'':'s')+' por revisar':'No tienes pagos pendientes.'}</p>{pending.length>0&&<button className="mw-primary" type="button" onClick={()=>history('pending')}>Ver pagos pendientes <ChevronRight size={18}/></button>}</>:<p className="mw-muted">{error?'No se pudo consultar el estado.':'Consultando estado…'}</p>}</div>
  <h3>Medios de pago</h3><div className="mw-panel"><button className="mw-row" type="button" onClick={()=>setView('methods')}><span className="mw-icon"><CreditCard size={22}/></span><span className="mw-copy"><strong>Agregar tarjeta</strong><small>Crédito o débito · próximamente</small></span><ChevronRight size={18}/></button></div>
  <div className="mw-section-head"><h3>Últimos movimientos</h3><button type="button" className="mw-link" onClick={()=>history()}>Ver todos <ChevronRight size={15}/></button></div>
  {state&&!busy&&!rows.length&&<p className="mw-muted">No hay movimientos en esta sección.</p>}
  <div className="mw-panel mw-list">{rows.slice(0,3).map(row)}</div>
  <p className="mw-security"><LockKeyhole size={15}/> Historial privado. Los pagos directos de obras e inspectores se realizan fuera de MATCHTER.</p>
 </>}
 </section>
}
