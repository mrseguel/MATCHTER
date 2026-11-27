import React,{useEffect,useState} from 'react'
import {PaymentModeSettings} from '../../components/PaymentModeSettings.jsx'
async function request(client,path='',body){
 const token=await client.getJWTToken()
 if(typeof token!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw Error('No se pudo comprobar tu sesión')
 const res=await fetch('/api/auth-preview/admin/payments'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
 const data=await res.json().catch(()=>null)
 if(path==='/access'&&(res.status===403||res.status===404))return {authorized:false}
 if(!res.ok||!data)throw Error(data?.message||'Configuración no disponible')
 return data
}
export const paymentAdminAccess=client=>request(client,'/access')
export function PaymentAdminPanel({client,onBack}){
 const [config,setConfig]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function load(){setBusy(true);setError('');try{setConfig(await request(client))}catch(e){setConfig(null);setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[client])
 async function save(availability){if(!config)return;setConfig(await request(client,'',{availability,revision:config.revision}))}
 return <><h2>Administración · Pagos</h2><button type="button" className="mai-secondary" onClick={onBack}>Volver a mi perfil</button>{error&&<p role="alert">{error}</p>}{config&&<PaymentModeSettings availability={config.availability} verifiedCustody={config.verifiedCustody===true} busy={busy} onSave={save}/>}<button type="button" className="mai-secondary" disabled={busy} onClick={load}>Actualizar configuración</button></>
}
