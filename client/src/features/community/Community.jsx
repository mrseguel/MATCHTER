import React,{useState,useEffect,useRef} from 'react'
import {html} from '../../lib/html.js'
import {Play,Heart,MessageCircle,UserPlus,UserCheck,Send,Plus,Flag,X,Film,Briefcase,Mail,Trash2,Volume2,VolumeX,Share2} from 'lucide-react'
import {identity,pairKey,toggleMember,mayHire,sendSocialMessage,decideSocialMessage,servicePrompt} from './model.js'

const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)
const categories=['Obra gruesa','Electricidad','Gasfitería','Carpintería','Pintura','Arquitectura','Remodelación','Terminaciones','Otros']
const MAX_BYTES=40*1024*1024

function Video({post,active}){
 const ref=useRef(null),[muted,setMuted]=useState(true)
 useEffect(()=>{
  const el=ref.current
  if(!el)return
  if(!active){el.pause();return}
  const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting&&e.intersectionRatio>=.7)el.play().catch(()=>{});else el.pause()}},{threshold:[0,.7,1]})
  observer.observe(el)
  return()=>{observer.disconnect();el.pause()}
 },[active,post.url])
 if(!post.url)return html`<div className="cm-poster" style=${post.poster?{backgroundImage:'url('+post.poster+')'}:{}}><span><${Film} size=${28}/> Ejemplo de publicación · sin video</span></div>`
 return html`<video ref=${ref} src=${post.url} muted=${muted} loop playsInline controls preload="metadata" aria-label=${post.caption}></video><button className="cm-sound" aria-label=${muted?'Activar sonido':'Silenciar'} onClick=${()=>setMuted(v=>!v)}>${muted?html`<${VolumeX} size=${19}/>`:html`<${Volume2} size=${19}/>`}</button>`
}
export function Community({active,actor,role,profiles,clients,inboxSignal=0,onOpenProfile}){
 const me=identity(actor?.id)
 const people=[...profiles,...clients]
 const person=id=>people.find(p=>identity(p.id)===identity(id))
 const [posts,setPosts]=useState(()=>[
  ...profiles.filter(p=>p.img).slice(0,3).map((p,i)=>({id:'sample-'+p.id,author:identity(p.id),poster:p.img,category:p.cat,caption:['Avance de obra · construcción en Temuco','Resultado de un proyecto residencial','Detalles de carpintería y techumbre'][i],likes:[],comments:[],sample:true}))
 ])
 const [follows,setFollows]=useState({})
 const [threads,setThreads]=useState({})
 const [hidden,setHidden]=useState({})
 const [mode,setMode]=useState('all')
 const [panel,setPanel]=useState(null)
 const [draft,setDraft]=useState('')
 const [error,setError]=useState('')
 const [shareNotice,setShareNotice]=useState('')
 const seenInbox=useRef(inboxSignal)
 const urls=useRef(new Set())
 const close=()=>{setPanel(null);setDraft('');setError('');setShareNotice('')}
 useEffect(()=>{close();setMode('all')},[me])
 useEffect(()=>()=>{urls.current.forEach(url=>URL.revokeObjectURL(url))},[])
 const followed=follows[me]||[]
 const post=posts.find(p=>p.id===panel?.postId)
 const author=person(panel?.author)
 const currentThread=panel?.author?threads[pairKey(me,panel.author)]:null
 const visible=posts.filter(p=>!(hidden[me]||[]).includes(p.id)&&(mode==='all'||(mode==='following'&&followed.includes(p.author))||(mode==='mine'&&p.author===me)))
 const updatePost=(id,fn)=>setPosts(ps=>ps.map(p=>p.id===id?fn(p):p))
 const show=p=>{setPanel(p);setDraft('');setError('');setShareNotice('')}
 useEffect(()=>{if(inboxSignal!==seenInbox.current){seenInbox.current=inboxSignal;show({type:'inbox'})}},[inboxSignal])
 const sharePost=async p=>{
  const text=(person(p.author)?.name||'Perfil')+' · Match Play\n'+p.caption
  try {
   if(p.file&&navigator.canShare?.({files:[p.file]})&&navigator.share){await navigator.share({title:'Match Play',text,files:[p.file]});return}
   if(navigator.share){await navigator.share({title:'Match Play',text});return}
  } catch(e){if(e.name==='AbortError')return}
  show({type:'share',postId:p.id,text})
 }
 const copyShare=async()=>{try{await navigator.clipboard.writeText(panel.text);setShareNotice('Descripción copiada')}catch{setShareNotice('Selecciona y copia el texto manualmente.')}}
 const publish=e=>{
  e.preventDefault()
  const data=new FormData(e.currentTarget),file=data.get('video'),caption=String(data.get('caption')||'').trim()
  if(!me||!caption||!file?.size||!['video/mp4','video/webm','video/quicktime','video/x-m4v'].includes(file.type)){setError('Selecciona un video MP4, WebM o MOV y escribe una descripción.');return}
  if(file.size>MAX_BYTES){setError('El límite de esta demostración es de 40 MB por video.');return}
  const url=URL.createObjectURL(file), probe=document.createElement('video')
  urls.current.add(url)
  probe.preload='metadata'
  probe.onloadedmetadata=()=>{
   if(!Number.isFinite(probe.duration)||probe.duration>180||probe.duration<=0){URL.revokeObjectURL(url);urls.current.delete(url);setError('Selecciona un video de hasta 3 minutos.');return}
   setPosts(ps=>[{id:uid(),author:me,url,file,caption,category:String(data.get('category')),likes:[],comments:[]},...ps]);setMode('all');close()
  }
  probe.onerror=()=>{URL.revokeObjectURL(url);urls.current.delete(url);setError('Este navegador no puede reproducir el formato seleccionado.')}
  probe.src=url
 }
 const send=()=>{
  const body=draft.trim(),to=identity(panel?.author)
  if(!body||!to)return
  setThreads(s=>sendSocialMessage(s,me,to,body,uid()));setDraft('')
 }
 const myThreads=Object.entries(threads).filter(([,t])=>t.participants.includes(me))
 return html`<section className="cm" aria-label="Match Play">
  <div className="cm-top"><div><strong>Match Play</strong></div><div className="cm-row"><button className="cm-icon" aria-label="Mensajes de Match Play" onClick=${()=>show({type:'inbox'})}><${Mail} size=${22}/></button><button className="cm-publish" onClick=${()=>show({type:'upload'})}><${Plus} size=${19}/><span>Publicar</span></button></div></div>
  <div className="cm-tabs">${[['all','Para ti'],['following','Siguiendo'],['mine','Mis videos']].map(([k,label])=>html`<button key=${k} className=${mode===k?'selected':''} onClick=${()=>setMode(k)}>${label}</button>`)}</div>
  <p className="cm-notice">Demo local · publicaciones e interacciones duran esta sesión. No ingreses datos privados.</p>
  <div className="cm-feed">${visible.length?visible.map(p=>{
   const a=person(p.author),own=p.author===me,liked=p.likes.includes(me),following=followed.includes(p.author)
   return html`<article className="cm-video" key=${p.id}><${Video} post=${p} active=${active&&!panel}/><div className="cm-shade"></div><div className="cm-caption"><button className="cm-author" onClick=${()=>show({type:'author',author:p.author})}>@${a?.name||'Perfil'} </button><small>${a?.role||'Cliente'} · ${p.category}</small><p>${p.caption}</p>${mayHire(role,me,p.author,profiles)&&html`<button className="cm-hire" onClick=${()=>show({type:'message',author:p.author,service:true})}>Consultar servicio <span aria-hidden="true">›</span></button>`}</div>
   <div className="cm-actions">${!own&&html`<button aria-label=${following?'Dejar de seguir':'Seguir'} onClick=${()=>setFollows(f=>({...f,[me]:toggleMember(f[me]||[],p.author)}))}>${following?html`<${UserCheck}/>`:html`<${UserPlus}/>`}<small>${following?'Siguiendo':'Seguir'}</small></button>`}<button aria-label="Me gusta video" aria-pressed=${liked} className=${liked?'liked':''} onClick=${()=>updatePost(p.id,x=>({...x,likes:toggleMember(x.likes,me)}))}><${Heart} fill=${liked?'currentColor':'none'}/><small>${p.likes.length}</small></button><button aria-label="Comentarios" onClick=${()=>show({type:'comments',postId:p.id})}><${MessageCircle}/><small>${p.comments.length}</small></button>${!own&&html`<button aria-label="Mensaje privado" onClick=${()=>show({type:'message',author:p.author})}><${Send}/><small>Mensaje</small></button>`}<button aria-label="Compartir publicación" onClick=${()=>sharePost(p)}><${Share2}/><small>Compartir</small></button><button aria-label=${own?'Eliminar publicación':'Reportar u ocultar'} onClick=${()=>show({type:own?'delete':'report',postId:p.id})}>${own?html`<${Trash2}/>`:html`<${Flag}/>`}</button></div></article>`
  }):html`<div className="cm-empty"><${Film} size=${36}/><h3>${mode==='following'?'Aún no sigues perfiles con publicaciones':'Todavía no hay videos aquí'}</h3><button className="btn out" onClick=${()=>setMode('all')}>Ver Match Play</button></div>`}</div>
  ${panel&&html`<div className="cm-modal"><div className="cm-sheet"><div className="cm-row cm-heading"><h3>${({upload:'Publicar video',comments:'Comentarios',author:'Perfil de Match Play',message:'Mensaje privado',inbox:'Mensajes de Match Play',report:'Reportar publicación',delete:'Eliminar publicación',share:'Compartir publicación'})[panel.type]}</h3><button className="cm-icon" aria-label="Cerrar" onClick=${close}><${X}/></button></div>
   ${panel.type==='upload'&&html`<form className="cm-form" onSubmit=${publish}><label>Video de construcción<input name="video" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" required/></label><label>Especialidad<select name="category">${categories.map(c=>html`<option key=${c}>${c}</option>`)}</select></label><label>Descripción<textarea name="caption" maxLength="500" required placeholder="Muéstranos tu trabajo, un avance o el resultado final"/></label><label className="cm-check"><input type="checkbox" required/> Tengo permiso para compartir este video y no expongo información privada de terceros.</label><p className="mut">Máximo 3 minutos y 40 MB en esta demo. El archivo no se envía a un servidor.</p><button className="btn">Publicar</button></form>`}
   ${panel.type==='comments'&&post&&html`<div>${post.comments.map(c=>html`<div className="cm-comment" key=${c.id}><b>${person(c.author)?.name||'Perfil'}</b><p>${c.body}</p></div>`)}${!post.comments.length&&html`<p className="mut">Sé la primera persona en comentar.</p>`}<form className="cm-form" onSubmit=${e=>{e.preventDefault();if(!draft.trim())return;updatePost(post.id,x=>({...x,comments:[...x.comments,{id:uid(),author:me,body:draft.trim()}]}));setDraft('')}}><textarea value=${draft} onChange=${e=>setDraft(e.target.value)} maxLength="500" placeholder="Escribe un comentario" required/><button className="btn">Comentar</button></form></div>`}
   ${panel.type==='author'&&author&&html`<div><h3>${author.name}</h3><p className="mut">${author.role} · ${author.loc}</p><p>${author.bio}</p><p>${Object.values(follows).filter(ids=>ids.includes(identity(author.id))).length} seguidores · ${posts.filter(p=>p.author===identity(author.id)).length} publicaciones</p>${mayHire(role,me,author.id,profiles)&&html`<button className="btn out" onClick=${()=>show({type:'message',author:identity(author.id),service:true})}>Consultar servicio</button>`}${profiles.some(p=>identity(p.id)===identity(author.id))&&html`<button className="btn out" onClick=${()=>{close();onOpenProfile(author)}}>Ver portafolio</button>`}${identity(author.id)!==me&&html`<button className="btn out" onClick=${()=>show({type:'message',author:identity(author.id)})}>Enviar mensaje</button>`}</div>`}
   ${panel.type==='inbox'&&html`<div>${myThreads.length?myThreads.map(([k,t])=>{const other=t.participants.find(x=>x!==me);return html`<button className="cm-inbox" key=${k} onClick=${()=>show({type:'message',author:other})}><b>${person(other)?.name||'Perfil'}</b><small>${t.status==='pending'?'Solicitud pendiente':t.status==='accepted'?'Conversación':'Solicitud rechazada'}</small></button>`}):html`<p className="mut">Aún no tienes mensajes sociales.</p>`}</div>`}
   ${panel.type==='message'&&author&&html`<div><b>${author.name}</b><p className="mut">Conversación privada. No crea un Match ni un contrato.</p>${currentThread?.messages.map(m=>html`<p className=${'cm-message '+(m.from===me?'own':'')} key=${m.id}>${m.body}</p>`)}${currentThread?.status==='pending'&&currentThread.recipient===me?html`<div className="cm-row"><button className="btn" onClick=${()=>setThreads(s=>decideSocialMessage(s,pairKey(me,panel.author),me,'accepted'))}>Aceptar</button><button className="btn out" onClick=${()=>setThreads(s=>decideSocialMessage(s,pairKey(me,panel.author),me,'rejected'))}>Rechazar</button></div>`:currentThread?.status==='pending'?html`<p className="mut">Esperando aceptación.</p>`:currentThread?.status==='rejected'?html`<p className="mut">Solicitud rechazada.</p>`:html`<form className="cm-form" onSubmit=${e=>{e.preventDefault();send()}}>${mayHire(role,me,author.id,profiles)&&html`<div className="cm-quick"><button type="button" className="chip" onClick=${()=>setDraft(servicePrompt('quote'))}>Solicitar presupuesto</button><button type="button" className="chip" onClick=${()=>setDraft(servicePrompt('project'))}>Hablar sobre un proyecto</button></div>`}<textarea value=${draft} onChange=${e=>setDraft(e.target.value)} maxLength="1000" placeholder="Escribe un mensaje" required/><button className="btn">${currentThread?'Enviar':'Enviar solicitud de mensaje'}</button></form>`}</div>`}
   ${panel.type==='share'&&html`<div className="cm-form"><p className="mut">Puedes compartir la descripción. Los videos de esta demo no tienen un enlace público permanente.</p><textarea readOnly value=${panel.text}/><button className="btn" onClick=${copyShare}>Copiar descripción</button>${shareNotice&&html`<p role="status">${shareNotice}</p>`}</div>`}
   ${panel.type==='report'&&post&&html`<div><p>Ocultar contenido de esta sesión. El reporte todavía no se envía a moderadores.</p><button className="btn" onClick=${()=>{setHidden(h=>({...h,[me]:[...(h[me]||[]),post.id]}));close()}}>Ocultar publicación</button></div>`}
   ${panel.type==='delete'&&post&&post.author===me&&html`<div><p>¿Eliminar tu publicación de esta sesión?</p><button className="btn" onClick=${()=>{setPosts(ps=>ps.filter(p=>p.id!==post.id));if(post.url){URL.revokeObjectURL(post.url);urls.current.delete(post.url)}close()}}>Eliminar</button></div>`}
   ${error&&html`<p role="alert" className="cm-error">${error}</p>`}</div></div>`}
 </section>`
}
