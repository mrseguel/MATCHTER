import React,{useState,useEffect,useRef} from 'react';
import {Compass,FileText,Calculator,Play,MessageCircle,ShieldCheck,UserRound,Settings,Sun,Moon,Monitor,ChevronRight,Lock,Bell,MapPin,Video,Globe,HelpCircle,LogOut,Trash2,SlidersHorizontal,UserRoundX,Smartphone} from 'lucide-react';
import './appearance.css';
const modes=['light','dark','auto'],key='matchter.appearance';
export function useAppearance(){
 const [mode,setMode]=useState(()=>{try{const v=localStorage.getItem(key);return modes.includes(v)?v:'light'}catch{return 'light'}});
 useEffect(()=>{const mq=window.matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.matchterTheme=mode==='dark'||(mode==='auto'&&mq.matches)?'dark':'light'};apply();mq.addEventListener?.('change',apply);try{localStorage.setItem(key,mode)}catch{}return()=>mq.removeEventListener?.('change',apply)},[mode]);
 return [mode,setMode]
}
const items=[['explorar',Compass,'Explorar'],['contratos',FileText,'Contratos'],['cotizador',Calculator,'Cotizador'],['videos',Play,'MATCHPLAY'],['mensajes',MessageCircle,'Mensajes'],['seguridad',ShieldCheck,'Reclamos'],['perfil',UserRound,'Mi perfil']];
export function IconNavigation({tab,role,goTab,messageCount=0,children}){
 const [tip,setTip]=useState(null),timer=useRef(null),hide=useRef(null),held=useRef(false),origin=useRef(null);
 const clear=()=>{clearTimeout(timer.current);timer.current=null};
 useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(hide.current)},[]);
 useEffect(()=>{setTip(null);clearTimeout(hide.current)},[tab]);
 const video=tab==='videos';
 return <nav className={'mn-nav'+(video?' mn-video':'')} aria-label="Navegación principal">
 {items.filter(([k])=>!video||k!=='videos').map(([k,Icon,label])=>{
 const active=tab===k||k==='explorar'&&role!=='Cliente'&&tab==='proyectos'||k==='perfil'&&['wallet','trabajos','solicitudes'].includes(tab);
 return <button type="button" key={k} className={'mn-item'+(active?' mn-active':'')+(k==='videos'?' mn-play':'')} aria-label={label} aria-current={active?'page':undefined} aria-describedby={tip===k?'mn-tip-'+k:undefined}
 onMouseEnter={()=>setTip(k)} onMouseLeave={()=>setTip(null)} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setTip(k)}} onBlur={()=>setTip(null)}
 onPointerDown={e=>{held.current=false;if(e.pointerType==='touch'||e.pointerType==='pen'){origin.current=[e.clientX,e.clientY];clear();timer.current=setTimeout(()=>{held.current=true;setTip(k)},480)}}}
 onPointerMove={e=>{if(origin.current&&Math.hypot(e.clientX-origin.current[0],e.clientY-origin.current[1])>9)clear()}}
 onPointerUp={()=>{clear();origin.current=null;if(held.current){clearTimeout(hide.current);hide.current=setTimeout(()=>setTip(null),1800)}}}
 onPointerCancel={()=>{clear();origin.current=null;setTip(null)}} onContextMenu={e=>e.preventDefault()}
 onClick={()=>{if(held.current){held.current=false;return}setTip(null);goTab(k)}}>
 <Icon size={k==='videos'?26:23} strokeWidth={1.8} fill={k==='videos'?'currentColor':'none'} aria-hidden="true"/>
 {k==='mensajes'&&messageCount>0&&<span className="mn-count">{messageCount}</span>}
 {tip===k&&<span className="mn-tooltip" role="tooltip" id={'mn-tip-'+k}>{label}</span>}
 </button>})}{children}</nav>
}
export function SettingsGear({onClick,video=false}){return <button type="button" className={'mn-gear'+(video?' mn-gear-video':'')} aria-label="Ajustes" onClick={onClick}><Settings size={21} strokeWidth={1.8}/><span className="mn-gear-tip" role="tooltip">Ajustes</span></button>}
const groups=[['Mi cuenta',[[UserRound,'Editar datos personales'],[Lock,'Contraseña y seguridad'],[ShieldCheck,'Privacidad y visibilidad'],[ShieldCheck,'Verificación de identidad']]],[ 'Preferencias',[[Bell,'Notificaciones'],[MapPin,'Ubicación y radio de búsqueda'],[SlidersHorizontal,'Preferencias de Explorar'],[Video,'Reproducción de videos'],[Smartphone,'Uso de datos móviles'],[Globe,'Idioma']]],[ 'Seguridad y asistencia',[[UserRoundX,'Usuarios bloqueados'],[HelpCircle,'Centro de ayuda'],[MessageCircle,'Contactar con MATCHTER'],[FileText,'Términos y condiciones'],[ShieldCheck,'Política de privacidad']]]];
export function SettingsPanel({mode,setMode,onProfile,onLogout}){
 return <div className="ms-settings"><div className="ms-label">APARIENCIA</div><div className="card ms-appearance"><h3>Tema de la aplicación</h3><p className="mut">Personaliza tu experiencia. MATCHPLAY conserva su identidad negra y blanca.</p><div className="ms-modes">{[[Sun,'Claro','light'],[Moon,'Oscuro','dark'],[Monitor,'Automático','auto']].map(([Icon,l,v])=><button key={v} type="button" aria-pressed={mode===v} className={mode===v?'chosen':''} onClick={()=>setMode(v)}><Icon size={21}/>{l}</button>)}</div></div>
 {groups.map(([title,rows])=><section key={title}><div className="ms-label">{title}</div><div className="ms-group">{rows.map(([Icon,label],i)=>{const active=title==='Mi cuenta'&&i===0;return <button type="button" key={label} className="ms-row" disabled={!active} onClick={active?onProfile:undefined}><Icon size={20}/><span>{label}</span>{active?<ChevronRight size={16}/>:<small>Próximamente</small>}</button>})}</div></section>)}
 <button className="ms-row ms-logout" onClick={onLogout}><LogOut size={20}/><span>Cerrar sesión</span></button><button className="ms-row ms-logout" disabled><Trash2 size={20}/><span>Eliminar mi cuenta</span><small>Próximamente</small></button><p className="mut ms-foot">MATCHTER · Vista previa. La apariencia se guarda en este navegador.</p></div>
}
