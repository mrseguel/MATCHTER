import React,{useEffect,useState} from 'react'
import {Wallet,Clock,CheckCircle2,Receipt,RefreshCw} from 'lucide-react'
import {messagesRequest} from './messagesApi.js'
const money=n=>Number(n).toLocaleString('es-CL',{style:'currency',currency:'CLP'})
const labels={recorded_demo:'Pago de prueba registrado',pending_demo:'Pendiente de registro',deferred_demo:'Descuento de prueba autorizado, no pagado'}
const titles={service_fee:'Tarifa de servicio MATCHTER',notary_fee:'Trámite notarial'}
const filters=[['all','Todos'],['recorded_demo','Registrados'],['pending','Pendientes']]
export function RealWallet({client,role,onBack,onOpenContract}){
 const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState('all'),[reload,setReload]=useState(0),[receiptBusy,setReceiptBusy]=useState(null),[receiptError,setReceiptError]=useState('')
 useEffect(()=>{let alive=true;setBusy(true);setError('');messagesRequest(client,'wallet',role).then(r=>{if(alive){if(!r.demo||r.realPaymentsEnabled!==false||!Array.isArray(r.movements))throw Error('Historial no disponible');setState(r)}}).catch(e=>{if(alive){setState(null);setError(e.message)}}).finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[client,role,reload])
 async function downloadReceipt(movementId){
  if(receiptBusy)return;setReceiptBusy(movementId);setReceiptError('')
  try{
   const receipt=await messagesRequest(client,'wallet/receipt',role,undefined,{movementId})
   if(receipt.demo!==true||receipt.realPayment!==false||receipt.taxDocument!==false||receipt.movement?.id!==movementId)throw Error('Comprobante no válido')
   const {saveWalletReceipt}=await import('./walletReceiptPdf.js')
   await saveWalletReceipt(receipt)
  }catch(e){setReceiptError(e.message)}finally{setReceiptBusy(null)}
 }
 const rows=state?.movements||[],recorded=rows.filter(r=>r.status==='recorded_demo'),pending=rows.filter(r=>r.status!=='recorded_demo')
 const shown=filter==='all'?rows:filter==='pending'?pending:recorded
 const sum=items=>items.reduce((total,r)=>total+r.amountCLP,0)
 return <section aria-label="Wallet de prueba"><div className="row sp"><h2><Wallet size={22}/> Wallet</h2><button className="chip" type="button" onClick={onBack}>Volver</button></div>
 <p className="mut">Historial privado del perfil activo. Esta versión registra exclusivamente simulaciones: no hay dinero disponible, cobros reales ni fondos en custodia.</p>
 {state&&<div className="ct-fee-summary"><p className="mut">Tarifas de los contratos de prueba recientes</p><div className="row sp"><span>Pagos simulados registrados</span><strong>{money(sum(recorded))}</strong></div><div className="row sp"><span>Pendientes o autorizados sin pago</span><strong>{money(sum(pending))}</strong></div></div>}
 <div className="row sp"><h3>Movimientos</h3><button className="chip" type="button" disabled={busy} onClick={()=>setReload(n=>n+1)}><RefreshCw size={14}/> Actualizar</button></div>
 <div className="wrap" aria-label="Filtrar movimientos">{filters.map(([id,label])=><button className="chip" type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
 {receiptError&&<p role="alert">{receiptError}</p>}{busy&&<p role="status">Consultando historial…</p>}{error&&<p role="alert">{error}</p>}
 {state&&!busy&&!shown.length&&<p className="mut">No hay movimientos en esta sección.</p>}
 {shown.map(r=><article className="card" key={r.id}><div className="row sp"><strong><Receipt size={16}/> {titles[r.kind]||'Tarifa de prueba'}</strong><b>{money(r.amountCLP)}</b></div><p>{r.projectTitle}</p><div className="row">{r.status==='recorded_demo'?<CheckCircle2 size={16}/>:<Clock size={16}/>}<span>{labels[r.status]}</span></div><p className="mut">{r.recordedAt?new Date(r.recordedAt).toLocaleString('es-CL'):'Sin pago registrado'} · Contrato v{r.agreementVersion}.{r.contractRevision}</p><button className="btn out" type="button" onClick={()=>onOpenContract(r.requestId)}>Ver conversación del contrato</button>{r.status==='recorded_demo'&&<button className="btn out" type="button" disabled={!!receiptBusy} onClick={()=>downloadReceipt(r.id)}>{receiptBusy===r.id?'Preparando…':'Descargar comprobante de prueba'}</button>}</article>)}
 {state?.hasMore&&<p className="mut">Se muestran hasta los 100 contratos firmados más recientes.</p>}
 <p className="mut">Los pagos de obra directos y los honorarios de inspectores no se registran como movimientos del Wallet. Los medios de pago reales todavía no están habilitados.</p></section>
}
