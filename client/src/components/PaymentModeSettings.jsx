import React,{useEffect,useId,useState} from 'react'
const choices=[
 ['direct-only','Solo contratación directa','Cada parte paga su tarifa MATCHTER. Los pagos de obra son externos y se mantiene el seguimiento de etapas.'],
 ['both','Ambas modalidades','El cliente elige en el chat antes de firmar; el prestador acepta las mismas condiciones.'],
 ['protected-only','Solo contratación protegida','Los nuevos contratos requieren resguardo de fondos mediante una integración financiera verificada.']
]
// Controlled component. Only an authenticated server may supply readiness and save settings.
export function PaymentModeSettings({availability='direct-only',verifiedCustody=false,onSave,busy=false}){
 const group=useId(),[selected,setSelected]=useState(availability),[saving,setSaving]=useState(false),[error,setError]=useState('')
 useEffect(()=>{setSelected(availability);setError('')},[availability])
 const locked=busy||saving||typeof onSave!=='function'
 const allowed=selected==='direct-only'||verifiedCustody===true
 async function save(){
  if(locked||selected===availability||!allowed)return
  setSaving(true);setError('')
  try{await onSave(selected)}catch{setError('No se pudo guardar la configuración. Intenta nuevamente.')}finally{setSaving(false)}
 }
 return <section className="card" aria-label="Modalidades de contratación MATCHTER">
  <h3>Modalidades de contratación</h3>
  <p className="mut">Configuración vigente: {choices.find(([key])=>key===availability)?.[1]||'No disponible'}</p>
  <fieldset disabled={locked} style={{border:0,padding:0,margin:0,display:'grid',gap:12}}>
   <legend className="mut">Opciones disponibles para nuevos contratos</legend>
   {choices.map(([key,title,description])=><label key={key}><input type="radio" name={group} checked={selected===key} disabled={key!=='direct-only'&&!verifiedCustody} onChange={()=>setSelected(key)}/> <b>{title}</b><p className="mut">{description}</p></label>)}
  </fieldset>
  {!verifiedCustody&&<p className="mut">Resguardo de fondos no disponible: se requiere una integración financiera operativa y verificada.</p>}
  <p className="mut">El cambio no modifica contratos existentes.</p>
  {typeof onSave!=='function'&&<p className="mut">Vista de demostración: guardado administrativo aún no conectado.</p>}
  {error&&<p role="alert">{error}</p>}
  <button type="button" className="btn" disabled={locked||selected===availability||!allowed} onClick={save}>{saving?'Guardando…':'Guardar configuración'}</button>
 </section>
}
