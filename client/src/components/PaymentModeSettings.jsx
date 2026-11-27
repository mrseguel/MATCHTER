import React,{useEffect,useState} from 'react'

// Controlled component for an authenticated administrator screen.
// The server must provide verifiedCustody and enforce authorization on save.
export function PaymentModeSettings({mode='direct',verifiedCustody=false,onSave,busy=false}){
 const [selected,setSelected]=useState(mode),[saving,setSaving]=useState(false),[error,setError]=useState('')
 useEffect(()=>{setSelected(mode);setError('')},[mode])
 const locked=busy||saving||typeof onSave!=='function'
 async function save(){
  if(locked||selected===mode||selected==='protected'&&!verifiedCustody)return
  setSaving(true);setError('')
  try{await onSave(selected)}catch{setError('No se pudo guardar la modalidad. Intenta nuevamente.')}finally{setSaving(false)}
 }
 return <section className="card" aria-label="Modalidad de pagos MATCHTER">
  <h3>Modalidad de pagos</h3>
  <p className="mut">Modalidad vigente: {mode==='protected'?'Con resguardo de fondos':'Sin resguardo de fondos'}</p>
  <fieldset disabled={locked} style={{border:0,padding:0,margin:0,display:'grid',gap:12}}>
   <legend className="mut">Selecciona la modalidad para nuevos contratos</legend>
   <label><input type="radio" name="matchterPaymentMode" checked={selected==='direct'} onChange={()=>setSelected('direct')}/> <b>Sin resguardo de fondos</b><p className="mut">Cada parte paga su tarifa MATCHTER de $2.990. Los montos de los trabajos son informativos.</p></label>
   <label><input type="radio" name="matchterPaymentMode" checked={selected==='protected'} disabled={!verifiedCustody} onChange={()=>setSelected('protected')}/> <b>Con resguardo de fondos</b><p className="mut">El cliente paga la primera etapa junto con su tarifa. El prestador paga su tarifa o autoriza su descuento al liberar el primer pago que permita cubrirla.</p></label>
  </fieldset>
  {!verifiedCustody&&<p className="mut">Para habilitar el resguardo, se requiere una integración financiera operativa y verificada.</p>}
  <p className="mut">El cambio no modifica contratos existentes.</p>
  {typeof onSave!=='function'&&<p className="mut">Configuración aún no conectada al servidor.</p>}
  {error&&<p role="alert">{error}</p>}
  <button type="button" className="btn" disabled={locked||selected===mode||selected==='protected'&&!verifiedCustody} onClick={save}>{saving?'Guardando…':'Guardar modalidad'}</button>
 </section>
}
