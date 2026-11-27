import React,{useState,useEffect,useMemo} from 'react'
import {createRoot} from 'react-dom/client'
import {ApprovedClaims} from './client/src/features/claims/ApprovedClaims.jsx'
import {ApprovedPlans} from './client/src/features/claims/ApprovedPlans.jsx'
import './client/src/features/claims/approvedClaims.css'
import {MediationAdminCenter} from './client/src/features/auth/MediationPanel.jsx'
import {InspectorInbox} from './client/src/features/auth/InspectionPanel.jsx'
import './client/src/styles.css'
import './client/src/features/contracts/contracts.css'
import './client/src/features/auth/wallet.css'
import './client/src/features/lifecycle/workflow.css'
import './client/src/features/claims/claims.css'
const config={mediationEnabled:true,inspectionsEnabled:true,caseCompletionEnabled:false,inspectionAttachmentsEnabled:false}
const roles=[['client','Cliente'],['provider','Maestro'],['mediator','Mediador'],['inspector','Inspector'],['plans','Planes']]
function clientFor(v){const safe=x=>{if(!x)throw Error('Registro no disponible para este perfil');return structuredClone(x)};return {qaReadOnly:true,qaConfig:config,qaRequest:async(path,role,q)=>{if(role!==v.role)throw Error('Perfil no válido');switch(path){case '':return safe({threads:[v.thread]});case 'claims':return safe(v.claims);case 'stages':return safe(v.stages);case 'mediation':return safe(v.cases?.[q.claimId]);case 'mediation/export':return safe(v.exports?.[q.claimId]);case 'inspections':return safe(v.inspections?.[q.claimId]);case 'inspections/inbox':return safe(v.inbox);case 'inspections/conversation':return safe(v.conversations?.[q.orderId]);default:throw Error('Acción no disponible en esta vista de consulta')}},qaAdminRequest:async path=>{if(!v.queue)throw Error('Acceso no disponible');const [p,query]=path.split('?'),id=new URLSearchParams(query).get('claimId');if(!p)return safe(v.queue);if(p==='/access')return {authorized:true};if(p==='/case')return safe(v.cases[id]);if(p==='/export')return safe(v.exports[id]);throw Error('Acción no disponible')}}}
function App(){const [data,setData]=useState(null),[error,setError]=useState(''),[key,setKey]=useState('client'),[page,setPage]=useState(0)
 useEffect(()=>{fetch('/dispute-snapshot.json').then(r=>{if(!r.ok)throw Error('Vista no disponible');return r.json()}).then(setData).catch(e=>setError(e.message))},[])
 const client=useMemo(()=>data&&key!=='plans'?clientFor(data.views[key]):null,[data,key])
 const reset=()=>setPage(p=>p+1)
 return <div className="app" style={{maxWidth:520,margin:'0 auto'}}><header className="hd"><div className="logo">MATCHTER<small>QA</small></div></header><main className="main" style={{padding:16}}><p className="mut">Vista QA · Expedientes ficticios recuperados de Neon. Los reclamos nuevos son ejemplos temporales del navegador. Sin cobros reales.</p><div className="row" style={{flexWrap:'wrap',gap:8,marginBottom:16}}>{roles.map(([k,l])=><button key={k} className={'chip'+(key===k?' on':'')} onClick={()=>{setKey(k);reset()}}>{l}</button>)}</div>{error&&<p role="alert">{error}</p>}{!data&&!error&&<p>Cargando expediente…</p>}{key==='plans'&&data&&<ApprovedPlans onBack={()=>setKey('client')}/ >}{client&&<div key={key+page}>{key==='mediator'?<MediationAdminCenter client={client} onBack={reset}/>:key==='inspector'?<InspectorInbox client={client} role={data.views[key].role} onBack={reset}/>:<ApprovedClaims view={data.views[key]}/>}</div>}<p className="mut">No se habilitan adjuntos, actuaciones persistentes, plazos, sanciones ni notificaciones en vivo. Los datos son exclusivamente de prueba.</p></main></div>}
createRoot(document.getElementById('root')).render(<App/>)
