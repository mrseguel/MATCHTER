import React,{useEffect,useRef,useState} from 'react'
import {ArrowLeftRight,Check,ChevronDown,UserRound} from 'lucide-react'
import {ACCOUNT_TYPES,roleForLabel,displayRole} from './realAuthFlow.js'
import {RoleIcon} from './AuthPreview.jsx'
import './profileSwitch.css'
import {PaymentAdminPanel,paymentAdminAccess} from './PaymentAdminPanel.jsx'
import {CaseNotices,InspectorAdministration,inspectorAdminAccess} from './CaseCompletionPanels.jsx'
import {messagesRequest} from './messagesApi.js'
import {InspectorInbox} from './InspectionPanel.jsx'
import {MediationAdminCenter,mediationAccess} from './MediationPanel.jsx'
import {ClaimsCenter} from './StageClaimsPanel.jsx'
import {RealMessages} from './RealMessages.jsx'
import {RealSwipe} from './RealSwipe.jsx'
import {ProfileDetailsEditor} from './ProfileDetailsEditor.jsx'
const types=ACCOUNT_TYPES.map(t=>({label:t[1],role:roleForLabel(t[1]),icon:t[0]}))
export function ProfileSwitchIntro({onClose}){
 const button=useRef(null)
 useEffect(()=>{button.current?.focus()},[])
 return <div className="mt-intro-layer" role="presentation"><section className="mt-intro" role="alertdialog" aria-modal="true" aria-labelledby="mt-intro-title" aria-describedby="mt-intro-copy" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}if(e.key==='Tab'){e.preventDefault();button.current?.focus()}}} onClick={e=>e.stopPropagation()}>
  <div className="mt-intro-top"><span className="mt-intro-icon"><ArrowLeftRight size={23}/></span><span className="mt-intro-tag">UNA CUENTA, CUATRO PERFILES</span></div>
  <h2 id="mt-intro-title">Tu elección es solo el comienzo</h2>
  <p id="mt-intro-copy">Elige tu perfil inicial. Podrás cambiarlo en cualquier momento desde <strong>“Mi perfil”</strong>, usando el botón junto a tu foto y nombre, sin cerrar sesión ni crear otra cuenta.</p>
  <div className="mt-intro-example" aria-label="Ejemplo del selector de perfiles">
   <small>Mi perfil · Ejemplo</small>
   <div className="mt-example-person"><span className="mt-example-avatar"><UserRound size={23}/></span><div><strong>Tu nombre</strong><small>Cliente</small></div><span className="mt-example-switch"><ArrowLeftRight size={14}/> Cambiar perfil <ChevronDown size={13}/></span></div>
   <div className="mt-example-menu">{types.map(t=><div key={t.role}><RoleIcon type={t.label} fallback={t.icon}/><span>{displayRole(t.role)}</span>{t.role==='Cliente'?<Check size={15} className="mt-orange"/>:<ArrowLeftRight size={15}/>}</div>)}</div>
  </div>
  <button ref={button} type="button" className="mt-primary" onClick={onClose}>Entendido, elegir mi perfil</button>
 </section></div>
}
async function profileRequest(client,path,body){
 const jwt=await client.getJWTToken()
 if(typeof jwt!=='string'||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(jwt))throw Error('No se pudo comprobar tu sesión')
 const r=await fetch('/api/auth-preview/profiles'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+jwt,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
 const data=await r.json().catch(()=>null)
 if(!r.ok)throw Error(data?.message||'No se pudieron consultar tus perfiles (HTTP '+r.status+')')
 if(!Array.isArray(data?.profiles)||!data.profiles.some(p=>p.role===data.activeRole)||!data.profiles.every(p=>types.some(t=>t.role===p.role)))throw Error('Respuesta de perfiles no válida')
 return data
}
export function ProfileSwitchPanel({client,session,profile,onLogout,busy:parentBusy,error:parentError}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[open,setOpen]=useState(false),[section,setSection]=useState('profile'),[messageView,setMessageView]=useState(null)
 const [claimsEnabled,setClaimsEnabled]=useState(false),[inspectionsEnabled,setInspectionsEnabled]=useState(false),[completionEnabled,setCompletionEnabled]=useState(false),[inspectorAdmin,setInspectorAdmin]=useState(false),[unread,setUnread]=useState(0)
 useEffect(()=>{let alive=true;fetch('/api/auth-preview/config').then(r=>r.ok?r.json():null).then(r=>{if(alive){setClaimsEnabled(r?.stageClaimsEnabled===true);setInspectionsEnabled(r?.inspectionsEnabled===true);setCompletionEnabled(r?.caseCompletionEnabled===true)}}).catch(()=>{});return()=>{alive=false}},[])
 const [mediatorAccess,setMediatorAccess]=useState(false)
 useEffect(()=>{let alive=true;setMediatorAccess(false);mediationAccess(client).then(r=>{if(alive)setMediatorAccess(r.authorized===true)}).catch(()=>{});return()=>{alive=false}},[client])
 const [adminAccess,setAdminAccess]=useState(false)
 useEffect(()=>{let alive=true;setAdminAccess(false);paymentAdminAccess(client).then(r=>{if(alive)setAdminAccess(r.authorized===true)}).catch(()=>{});return()=>{alive=false}},[client])
 const initial=useRef(false)
 const active=data?.activeRole||profile.role
 useEffect(()=>{if(!completionEnabled)return;let alive=true;inspectorAdminAccess(client).then(r=>{if(alive)setInspectorAdmin(r.authorized===true)}).catch(()=>{});async function loadNotices(){try{const r=await messagesRequest(client,'case-notices',active);if(alive)setUnread(r.notices.filter(n=>!n.read).length)}catch{}}loadNotices();const timer=setInterval(loadNotices,15000);return()=>{alive=false;clearInterval(timer)}},[completionEnabled,client,active])
 async function load(){setBusy(true);setError('');try{setData(await profileRequest(client,''))}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{if(!initial.current){initial.current=true;load()}},[])
 async function select(role){setBusy(true);setError('');setNotice('');try{setData(await profileRequest(client,'/switch',{role}));setOpen(false);setNotice('Perfil activo actualizado.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 const blocked=busy||parentBusy
 return <><main className="mai-page"><section className="mai-card mt-profile-card"><h1>Matchter</h1><p className="mai-note">Integración privada · Tu identidad y tus perfiles se guardan realmente. SWIPE y mensajes de pruebas conectados a Neon. Los demás módulos siguen separados.</p>
 <nav className="mt-real-nav" aria-label="Navegación privada"><button disabled={blocked||!data} type="button" className={section==='profile'?'':'mai-secondary'} aria-current={section==='profile'?'page':undefined} onClick={()=>setSection('profile')}>Mi perfil</button><button disabled={blocked||!data} type="button" className={section==='swipe'?'':'mai-secondary'} aria-current={section==='swipe'?'page':undefined} onClick={()=>setSection('swipe')}>SWIPE</button><button type="button" className="mai-secondary" disabled={blocked||!data} onClick={()=>setMessageView({})}>Mensajes</button>{claimsEnabled&&<button type="button" className={section==='claims'?'':'mai-secondary'} disabled={blocked||!data} onClick={()=>setSection('claims')}>Reclamos</button>}{inspectionsEnabled&&active==='Profesional'&&<button type="button" className={section==='inspector'?'':'mai-secondary'} disabled={blocked||!data} onClick={()=>setSection('inspector')}>Inspecciones técnicas</button>}{completionEnabled&&<button type="button" className="mai-secondary" onClick={()=>setSection('case-notices')}>Avisos {unread>0?'('+unread+')':''}</button>}{inspectorAdmin&&<button type="button" className="mai-secondary" onClick={()=>setSection('inspector-admin')}>Administrar inspectores</button>}{adminAccess&&<button type="button" className={section==='admin'?'':'mai-secondary'} disabled={blocked} onClick={()=>setSection('admin')}>Administración</button>}{mediatorAccess&&<button type="button" className={section==='mediation-admin'?'':'mai-secondary'} disabled={blocked} onClick={()=>setSection('mediation-admin')}>Mediación administrativa</button>}</nav>
 {section==='case-notices'&&completionEnabled?<CaseNotices key={active} client={client} role={active} onCount={setUnread} onBack={()=>setSection('profile')}/>:section==='inspector-admin'&&inspectorAdmin?<InspectorAdministration client={client} onBack={()=>setSection('profile')}/>:section==='inspector'&&inspectionsEnabled&&active==='Profesional'?<InspectorInbox key={active} client={client} role={active} onBack={()=>setSection('profile')}/>:section==='mediation-admin'&&mediatorAccess?<MediationAdminCenter client={client} onBack={()=>setSection('profile')}/>:section==='claims'&&claimsEnabled?<ClaimsCenter key={active} client={client} role={active} onBack={()=>setSection('profile')}/>:section==='admin'&&adminAccess?<PaymentAdminPanel client={client} onBack={()=>setSection('profile')}/>:section==='profile'?<><h2>Mi perfil</h2><div className="mt-person"><span className="mt-example-avatar"><UserRound size={27}/></span><div className="mt-person-name"><strong>{session?.user?.name||'Mi cuenta'}</strong><small>{displayRole(active)}</small></div><button type="button" className="mt-switch" aria-expanded={open} disabled={blocked||!data} onClick={()=>setOpen(v=>!v)}><ArrowLeftRight size={15}/> Cambiar perfil <ChevronDown size={15}/></button></div>
 <p className="mt-email">{session?.user?.email}</p>
 {open&&<div className="mt-profile-menu"><strong>Cambiar perfil</strong>{types.map(t=>{const current=active===t.role;return <button key={t.role} type="button" disabled={blocked||current} onClick={()=>select(t.role)}><RoleIcon type={t.label} fallback={t.icon}/><span>{displayRole(t.role)}<small>{current?'Activo':'Cambiar a este perfil'}</small></span>{current?<Check size={18} className="mt-orange"/>:<ArrowLeftRight size={17}/>}</button>})}</div>}
 {(error||parentError)&&<p className="mai-error" role="alert">{error||parentError}</p>}{notice&&<p className="mai-notice" role="status">{notice}</p>}
 {data&&<ProfileDetailsEditor key={active} client={client} role={active}/>}
 </>:data?<RealSwipe key={active} client={client} role={active} onOpenMessages={requestId=>setMessageView({requestId})}/>:null}
 <p>Perfil persistente: <strong>{displayRole(active)}</strong></p><button type="button" disabled={blocked} onClick={load}>Comprobar cuenta guardada</button><button type="button" className="mai-secondary" disabled={blocked} onClick={onLogout}>Cerrar sesión</button>
 </section></main>{messageView&&data&&<RealMessages key={active} client={client} role={active} initialRequestId={messageView.requestId} onBack={()=>setMessageView(null)}/>}</>
}
