import React,{useState} from 'react';
import {Bell,CheckCheck,ChevronRight,Inbox} from 'lucide-react';
import {categories} from './model.js';
import './notifications.css';
export function NotificationBell({count,onClick,video=false}){return <button className={'mn-gear mn-notify'+(video?' mn-notify-video':'')} type="button" aria-label={count?'Notificaciones, '+count+' sin leer':'Notificaciones'} onClick={onClick}><Bell size={22} strokeWidth={1.8}/>{count>0&&<span className="mn-notify-count">{count>99?'99+':count}</span>}<span className="mn-gear-tip" role="tooltip">Notificaciones</span></button>}
export function NotificationCenter({items,read,onRead,onAll,onOpen}){
 const [filter,setFilter]=useState('Todas'),[unread,setUnread]=useState(false);
 const shown=items.filter(n=>(filter==='Todas'||filter===n.category)&&(!unread||!read.includes(n.id)));
 return <section className="nc"><div className="nc-top"><div><h2>Notificaciones</h2><p className="mut">{items.filter(n=>!read.includes(n.id)).length} sin leer</p></div><button className="chip" onClick={onAll}><CheckCheck size={15}/> Marcar todas</button></div><label className="nc-unread"><input type="checkbox" checked={unread} onChange={e=>setUnread(e.target.checked)}/> Solo sin leer</label><div className="nc-filters">{['Todas',...categories].map(c=><button key={c} className={'chip '+(filter===c?'on':'')} onClick={()=>setFilter(c)}>{c}</button>)}</div>
 {!shown.length?<div className="nc-empty"><Inbox size={35}/><h3>{filter==='Todas'&&!unread?'Aún no tienes notificaciones':'No tienes avisos en esta categoría'}</h3><p className="mut">Las novedades de tu cuenta aparecerán aquí.</p></div>:shown.map(n=><button key={n.id} className={'nc-item'+(!read.includes(n.id)?' unread':'')} onClick={()=>{onRead(n.id);onOpen(n)}}><span className="nc-dot"/><span className="nc-content"><small>{n.category}{n.reminder?' · Recordatorio':''}{n.sample?' · Ejemplo':''}</small><b>{n.title}</b><span>{n.body}</span></span><ChevronRight size={16}/></button>)}
 <p className="mut nc-note">Vista previa: avisos de la actividad de esta sesión. Las alertas push y los recordatorios programados se habilitarán con el servidor definitivo.</p></section>
}
