import React,{useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,Bookmark,Check,Heart,RefreshCw,Send,UserRound,X,MapPin,Hammer,Inbox,Eye,EyeOff,Filter} from 'lucide-react'
import {displayRole} from '../../profileRoles.js'
import {ARAUCANIA_CITIES} from './araucaniaCities.js'
import {swipeRequest} from './swipeApi.js'
import './swipeReal.css'
const modes=['Maestro o contratista','Profesional','Empresa']
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n)
const statusLabel={pending:'Pendiente',accepted:'Match',rejected:'Rechazada'}
const emptyInvite=()=>({projectTitle:'',description:'',specifications:'',location:'',budget:'',antecedents:''})
const emptyCard=()=>({displayName:'',city:'',specialty:'',bio:'',workMode:''})
const modeLabel=v=>({Independiente:'Maestro independiente','Con equipo':'Maestro con equipo',Contratista:'Contratista'})[v]||v
export function RealSwipe({client,role,onOpenMessages}){
 const customer=role==='Cliente'
 const [tab,setTab]=useState(customer?'discover':'inbox')
 const [cards,setCards]=useState([]),[passed,setPassed]=useState([]),[filters,setFilters]=useState({search:'',city:'',kind:''}),[applied,setApplied]=useState({search:'',city:'',kind:''}),[requests,setRequests]=useState([]),[card,setCard]=useState(emptyCard),[published,setPublished]=useState(false),[consent,setConsent]=useState(false),[invite,setInvite]=useState(null),[draft,setDraft]=useState(emptyInvite),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[ready,setReady]=useState(false),[version,setVersion]=useState(0)
 const drag=useRef(null),lock=useRef(false)
 const refresh=()=>setVersion(v=>v+1)
 const active=cards.find(c=>!passed.includes(c.id))
 useEffect(()=>{
  let alive=true
  setBusy(true);setReady(false);setError('')
  const call=tab==='discover'?swipeRequest(client,'cards',role,undefined,applied):tab==='favorites'?swipeRequest(client,'favorites',role):tab==='inbox'?swipeRequest(client,'requests',role):swipeRequest(client,'own',role)
  call.then(d=>{if(!alive)return
   if(tab==='discover'||tab==='favorites')setCards(Array.isArray(d.cards)?d.cards:[])
   else if(tab==='inbox')setRequests(Array.isArray(d.requests)?d.requests:[])
   else{setCard(d.card?Object.fromEntries(Object.keys(emptyCard()).map(k=>[k,d.card[k]||''])):emptyCard());setPublished(d.card?.published===true);setConsent(false)}
   setReady(true)
  }).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setBusy(false)})
  return()=>{alive=false}
 },[client,role,tab,applied,version])
 function navigate(next){setTab(next);setPassed([]);setInvite(null);setNotice('');setError('');setReady(false)}
 async function run(fn){if(lock.current||busy)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await fn()}catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}}
 function pass(c){if(c&&!busy)setPassed(p=>p.includes(c.id)?p:[...p,c.id])}
 function startInvite(c){if(!c||busy)return;setInvite(c);setDraft(emptyInvite());setError('');setNotice('')}
 async function saveFavorite(c){await run(async()=>{const saved=!c.saved;await swipeRequest(client,'favorite',role,{targetId:c.id,saved});setCards(prev=>tab==='favorites'&&!saved?prev.filter(p=>p.id!==c.id):prev.map(p=>p.id===c.id?{...p,saved}:p));setNotice(saved?'Perfil guardado. No se ha enviado ninguna solicitud.':'Perfil eliminado de favoritos.')})}
 async function send(e){e.preventDefault();if(e.nativeEvent?.submitter?.dataset?.explicit!=='true')return;await run(async()=>{
  const budget=draft.budget===''?null:Number(draft.budget)
  const d=await swipeRequest(client,'invite',role,{targetId:invite.id,details:{...draft,budget}})
  setNotice(d.duplicate?'Esta solicitud ya existe: '+(statusLabel[d.request.status]||d.request.status)+'.':'Solicitud privada enviada. Habrá Match solo si el destinatario acepta.')
  setPassed(p=>[...p,invite.id]);setInvite(null)
 })}
 async function respond(r,decision){await run(async()=>{const d=await swipeRequest(client,'respond',role,{requestId:r.id,decision});setRequests(prev=>prev.map(x=>x.id===r.id?{...x,...d.request}:x));setNotice(d.match?'¡Es un Match! La solicitud fue aceptada.':'Solicitud rechazada.')})}
 async function publish(e){e.preventDefault();await run(async()=>{if(!consent)throw Error('Confirma qué datos serán visibles para otros usuarios de prueba');const d=await swipeRequest(client,'publish',role,{card});setPublished(d.card.published===true);setConsent(false);setNotice('Tarjeta publicada en el directorio privado de pruebas.')})}
 async function hide(){await run(async()=>{await swipeRequest(client,'hide',role,{});setPublished(false);setConsent(false);setNotice('Tarjeta retirada. Tus antecedentes y solicitudes anteriores se conservan.')})}
 const field=(key,setter)=>e=>setter(v=>({...v,[key]:e.target.value}))
 const cardView=(c,swipe=false)=><article className="sw-real-card" key={c.id}>
 <div className="sw-real-hero" onPointerDown={swipe?e=>{if(e.isPrimary){drag.current={x:e.clientX,y:e.clientY,id:c.id};e.currentTarget.setPointerCapture?.(e.pointerId)}}:undefined} onPointerCancel={()=>{drag.current=null}} onPointerUp={swipe?e=>{const s=drag.current;drag.current=null;if(!s||s.id!==c.id)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4){dx>0?startInvite(c):pass(c)}}:undefined}>
 <UserRound size={60} strokeWidth={1.1}/><small>Tarjeta de servicios</small></div><div className="sw-real-body">
 <span className="sw-real-tag">{displayRole(c.role)}</span><h3>{c.displayName}</h3><strong>{c.specialty}</strong><p className="sw-real-location"><MapPin size={15}/>{c.city}{c.workMode?' · '+modeLabel(c.workMode):''}</p>
 <p>{c.bio||'Sin descripción de servicios.'}</p><small>Antecedentes declarados por el proveedor. Identidad profesional no acreditada.</small>
 <div className="sw-real-actions">{swipe&&<button className="mai-secondary" disabled={busy} onClick={()=>pass(c)}><X size={18}/> Pasar</button>}<button className="mai-secondary" disabled={busy} onClick={()=>saveFavorite(c)}><Bookmark size={17} fill={c.saved?'currentColor':'none'}/>{c.saved?'Quitar guardado':'Guardar perfil'}</button><button disabled={busy} onClick={()=>startInvite(c)}><Heart size={17}/> Me interesa</button></div>
 </div></article>
 return <section className="sw-real" aria-label="SWIPE real">
 <div className="sw-real-title"><h2>SWIPE</h2><button type="button" className="mai-secondary sw-refresh" disabled={busy} onClick={refresh}><RefreshCw size={15}/> Actualizar</button></div>
 <p className="mai-note">Entorno privado · solo perfiles reales que elijan publicar su tarjeta. No se muestran proveedores ficticios.</p>
 <nav className="sw-real-tabs" aria-label="Secciones SWIPE">{(customer?[['discover','Explorar'],['favorites','Favoritos'],['inbox','Solicitudes']]:[['inbox','Solicitudes'],['publish','Mi tarjeta']]).map(([k,l])=><button type="button" key={k} disabled={busy} aria-current={tab===k?'page':undefined} className={tab===k?'on':'mai-secondary'} onClick={()=>navigate(k)}>{l}</button>)}</nav>
 {error&&<p className="mai-error" role="alert">{error}</p>}{notice&&<p className="mai-notice" role="status">{notice}</p>}
 {invite?<form className="sw-real-form" onKeyDown={e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')e.preventDefault()}} onSubmit={send}>
 <h3>Solicitud privada · {invite.displayName}</h3><p>Describe tu proyecto. No compartas dirección exacta, RUT, datos bancarios ni documentos personales.</p>
 <label>Nombre del proyecto *<input required maxLength={150} value={draft.projectTitle} onChange={field('projectTitle',setDraft)}/></label>
 <label>Descripción *<textarea required rows={4} maxLength={2000} value={draft.description} onChange={field('description',setDraft)}/></label>
 <label>Especificaciones<textarea rows={3} maxLength={1500} value={draft.specifications} onChange={field('specifications',setDraft)}/></label>
 <label>Ciudad o sector *<input required maxLength={120} value={draft.location} onChange={field('location',setDraft)}/></label>
 <label>Presupuesto aproximado (CLP, opcional)<input type="number" min={0} max={100000000000} step={1} value={draft.budget} onChange={field('budget',setDraft)}/></label>
 <label>Antecedentes adicionales<textarea rows={3} maxLength={1000} value={draft.antecedents} onChange={field('antecedents',setDraft)}/></label>
 <button disabled={busy} type="submit" data-explicit="true">Enviar solicitud privada</button><button disabled={busy} type="button" className="mai-secondary" onClick={()=>setInvite(null)}>Cancelar</button>
 </form>:tab==='discover'?<>
 <form className="sw-real-filters" onSubmit={e=>{e.preventDefault();setPassed([]);setApplied({...filters})}}>
 <label>Especialidad o nombre<input maxLength={120} value={filters.search} onChange={field('search',setFilters)} placeholder="Ej. Electricidad"/></label>
 <label>Ciudad<select value={filters.city} onChange={field('city',setFilters)}><option value="">Todas las ciudades</option>{ARAUCANIA_CITIES.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Tipo de proveedor<select value={filters.kind} onChange={field('kind',setFilters)}><option value="">Todos</option>{modes.map(m=><option key={m} value={m}>{displayRole(m)}</option>)}</select></label>
 <button disabled={busy}>Aplicar filtros</button></form>
 {ready&&(active?<><p className="sw-real-hint">Desliza hacia la izquierda para pasar o hacia la derecha para enviar una solicitud.</p>{cardView(active,true)}</>:<div className="sw-real-empty"><Inbox size={32}/><h3>{cards.length?'Ya exploraste estas tarjetas':'Aún no hay tarjetas disponibles'}</h3><p>{cards.length?'Puedes volver a recorrerlas.':'Amplía los filtros o espera a que otros usuarios de prueba publiquen sus servicios.'}</p>{cards.length>0&&<button type="button" className="mai-secondary" onClick={()=>setPassed([])}>Volver a explorar</button>}</div>)}
 </>:tab==='favorites'?ready&&(cards.length?cards.map(c=>cardView(c)): <p>No tienes perfiles guardados disponibles.</p>):tab==='inbox'?ready&&(requests.length?requests.map(r=><article key={r.id} className="sw-real-request"><span className="sw-real-tag">{statusLabel[r.status]||r.status}</span><h3>{r.details?.projectTitle}</h3><small>{r.direction==='outgoing'?'Enviada a '+r.providerName:'Solicitud recibida de un cliente'}</small><p>{r.details?.description}</p>{r.details?.specifications&&<p>Especificaciones: {r.details.specifications}</p>}<p>{r.details?.location}{r.details?.budget!=null?' · '+money(r.details.budget):''}</p>{r.details?.antecedents&&<p>Antecedentes: {r.details.antecedents}</p>}
 {r.status==='pending'&&r.direction==='incoming'&&<div className="sw-real-actions"><button className="mai-secondary" disabled={busy} onClick={()=>respond(r,'rejected')}>Rechazar</button><button disabled={busy} onClick={()=>respond(r,'accepted')}>Aceptar y crear Match</button></div>}
 {r.status==='accepted'&&<><p className="mai-notice">Match confirmado.</p><button type="button" disabled={busy} onClick={()=>onOpenMessages(r.id)}>Iniciar conversación</button></>}</article>):<div className="sw-real-empty"><Inbox size={30}/><p>Aún no tienes solicitudes.</p></div>):tab==='publish'&&ready?<form className="sw-real-form" onSubmit={publish}>
 <h3>{published?'Tu tarjeta está visible':'Publica tu tarjeta de servicios'}</h3><p>Elige expresamente la información que podrán ver los demás usuarios autenticados del entorno de pruebas. Tus antecedentes privados no se publican automáticamente.</p>
 <label>Nombre visible *<input required value={card.displayName} maxLength={150} onChange={field('displayName',setCard)} placeholder="Nombre de prueba o nombre comercial"/></label>
 <label>Ciudad *<select required value={card.city} onChange={field('city',setCard)}><option value="">Selecciona tu ciudad</option>{ARAUCANIA_CITIES.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Especialidad *<input required value={card.specialty} maxLength={120} onChange={field('specialty',setCard)}/></label>
 {role==='Maestro o contratista'&&<label>Modalidad *<select required value={card.workMode} onChange={field('workMode',setCard)}><option value="">Selecciona</option><option value="Independiente">Maestro independiente</option><option value="Con equipo">Maestro con equipo</option><option value="Contratista">Contratista</option></select></label>}
 <label>Descripción visible<textarea rows={4} maxLength={600} value={card.bio} onChange={field('bio',setCard)}/></label>
 <label className="sw-real-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo mostrar estos campos a otros usuarios de prueba. No contienen datos sensibles.</label>
 <button disabled={busy||!consent}>{published?'Actualizar tarjeta visible':'Publicar tarjeta'}</button>
 {published&&<button disabled={busy} type="button" className="mai-secondary" onClick={hide}><EyeOff size={16}/> Retirar tarjeta</button>}
 </form>:null}
 {!ready&&busy&&<p role="status">Cargando SWIPE…</p>}
 </section>
}
