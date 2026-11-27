import React,{useId,useState,useRef} from 'react'
import {Landmark,CreditCard,LockKeyhole} from 'lucide-react'
export const paymentOptions=[
 {id:'khipu',title:'Transferencia bancaria',provider:'Khipu',Icon:Landmark},
 {id:'mercadopago',title:'Tarjeta de crédito o débito',provider:'Mercado Pago',Icon:CreditCard}
]
// This selector previews the approved checkout UX. It does not invoke either provider.
export function PaymentMethodChoice({amount,onConfirm,onCancel,busy=false}){
 const group=useId(),[method,setMethod]=useState(''),[submitting,setSubmitting]=useState(false),running=useRef(false)
 const valid=Number.isSafeInteger(amount)&&amount>0
 async function confirm(){if(!valid||busy||running.current||!paymentOptions.some(p=>p.id===method))return;running.current=true;setSubmitting(true);try{await onConfirm()}finally{running.current=false;setSubmitting(false)}}
 return <section className="mw-wallet" aria-label="Elegir medio de pago"><h3>Pagar tarifa MATCHTER</h3><strong className="mw-amount">{valid?amount.toLocaleString('es-CL',{style:'currency',currency:'CLP'}):'Monto no disponible'}</strong><p className="mw-muted">Selecciona tu medio de pago</p><div className="mw-panel">{paymentOptions.map(({id,title,provider,Icon})=><label key={id} className="mw-card-choice"><span className="mw-icon"><Icon size={21}/></span><span className="mw-copy"><strong>{title}</strong><small>Mediante {provider}</small></span><input type="radio" name={group} checked={method===id} onChange={()=>setMethod(id)} disabled={busy||submitting}/></label>)}</div><p className="mw-security"><LockKeyhole size={15}/> Vista de prueba. Las pasarelas aún no están conectadas y no se solicitarán datos bancarios.</p><button type="button" className="mw-primary" disabled={!method||!valid||busy||submitting} onClick={confirm}>Continuar al pago de prueba</button><button type="button" className="mw-secondary" disabled={busy||submitting} onClick={onCancel}>Volver</button></section>
}
