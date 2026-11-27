import React,{useId,useState,useRef} from 'react'
import {Landmark,CreditCard,LockKeyhole} from 'lucide-react'
export const paymentOptions=[
 {id:'khipu',title:'Transferencia bancaria',provider:'Khipu',logo:'https://s3.amazonaws.com/static.khipu.com/buttons/2024/200x75-color.svg',Icon:Landmark},
 {id:'mercadopago',title:'Tarjeta de crédito o débito',provider:'Mercado Pago',logo:'https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/7.8.4/mercadopago/favicon.svg',Icon:CreditCard}
]
function ProviderLogo({logo,Icon}){
 const [failed,setFailed]=useState(false)
 return <span className="mw-provider-logo" aria-hidden="true">{failed?<Icon size={22}/>:<img src={logo} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</span>
}
// This selector previews the approved checkout UX. It does not invoke either provider.
export function PaymentMethodChoice({amount,onConfirm,onCancel,busy=false}){
 const group=useId(),[method,setMethod]=useState(''),[submitting,setSubmitting]=useState(false),running=useRef(false)
 const valid=Number.isSafeInteger(amount)&&amount>0
 async function confirm(){if(!valid||busy||running.current||!paymentOptions.some(p=>p.id===method))return;running.current=true;setSubmitting(true);try{await onConfirm()}finally{running.current=false;setSubmitting(false)}}
 return <section className="mw-wallet" aria-label="Elegir medio de pago"><h3>Pagar tarifa MATCHTER</h3><strong className="mw-amount">{valid?amount.toLocaleString('es-CL',{style:'currency',currency:'CLP'}):'Monto no disponible'}</strong><p className="mw-muted">Selecciona tu medio de pago</p><div className="mw-provider-options">{paymentOptions.map(({id,title,provider,logo,Icon})=><label key={id} className={"mw-card-choice mw-provider-choice"+(method===id?" mw-provider-selected":"")}><ProviderLogo logo={logo} Icon={Icon}/><span className="mw-copy"><strong>{title}</strong><small>Mediante {provider}</small></span><input type="radio" name={group} checked={method===id} onChange={()=>setMethod(id)} disabled={busy||submitting}/></label>)}</div><p className="mw-security"><LockKeyhole size={15}/><span>Al habilitarse el servicio, el pago se realizará en la plataforma segura del proveedor seleccionado. MATCHTER no procesa directamente los pagos ni recibe tus datos bancarios.</span></p><p className="mw-demo">Modo de prueba: las pasarelas aún no están conectadas. No se realizará ningún cobro real.</p><button type="button" className="mw-primary" disabled={!method||!valid||busy||submitting} onClick={confirm}>Continuar al pago de prueba</button><button type="button" className="mw-secondary" disabled={busy||submitting} onClick={onCancel}>Volver</button></section>
}
