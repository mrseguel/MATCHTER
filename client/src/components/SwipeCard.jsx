import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';

export function SwipeCard({p,onAct,onOpen}){
 const [dx,setDx]=useState(0);const [info,setInfo]=useState(false);const st=useRef(null);const cap=useRef(0);const ptr=useRef(0);
 const down=e=>{st.current=e.clientX;ptr.current=e.pointerId};
 const move=e=>{if(st.current===null)return;const d=e.clientX-st.current;if(Math.abs(d)>6&&!cap.current){cap.current=1;e.currentTarget.setPointerCapture(ptr.current)}setDx(d)};
 const up=()=>{if(st.current===null)return;st.current=null;cap.current=0;if(dx>110)onAct('like');else if(dx<-110)onAct('pass');setDx(0)};
 return html`<div className="sw" style=${{transform:`translateX(${dx}px) rotate(${dx/18}deg)`,transition:st.current===null?'transform .25s':'none'}} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}>
  <div className="hero" style=${{backgroundImage:`linear-gradient(180deg,transparent 55%,#07152fcc 100%),url(${p.photo})`,backgroundColor:p.c,backgroundPosition:'center',backgroundSize:'cover'}}><span className="pill" style=${{display:'flex',gap:6,alignItems:'center'}}><i style=${{width:8,height:8,borderRadius:'50%',background:'#17a34a'}}></i><span>Disponible<br/>en Temuco</span></span>
   ${dx>40&&html`<span className="stamp" style=${{left:16,color:'#17a34a',borderColor:'#17a34a'}}>ME INTERESA</span>`}
   ${dx<-40&&html`<span className="stamp" style=${{right:16,color:'#e11d48',borderColor:'#e11d48'}}>PASAR</span>`}
   <div className="cap"><div className="row"><div className="av" style=${{width:46,height:46,fontSize:18,borderRadius:13}}>${p.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
    <div style=${{flex:1,minWidth:0}}><b style=${{fontSize:19}}>${p.name}</b><div style=${{fontSize:13}}>${p.role} · ⭐ <b>${p.r}</b> (${p.n})</div></div>
    ${p.ver&&html`<span className="ver" style=${{padding:'5px 9px',fontSize:12}}>🛡️ Verificado</span>`}</div></div></div>
  <div className="inf">
   <div className="row" style=${{fontSize:13}}><b style=${{color:'#ff5a00'}}>${p.cat.toUpperCase()}</b><span className="mut">📍 ${p.loc}</span></div>
   <div className="clamp" style=${{fontSize:13,margin:'4px 0 6px'}}>${p.bio}</div>
   <button className="chip" style=${{width:'100%',background:'var(--soft)',borderRadius:12,display:'flex',justifyContent:'space-between',padding:'5px 12px'}} onClick=${()=>setInfo(i=>!i)}><span>ⓘ  Más info</span><span>${info?'▴':'▾'}</span></button>
   ${info&&html`<div className="mut" style=${{marginTop:4,fontSize:12}}>${p.jobs} trabajos · 0 reclamos abiertos · Responde en menos de 1 hora</div>`}
   <div className="acts"><div className="act"><b onClick=${()=>onAct('pass')} style=${{color:'#ff5a00'}}>✕</b>Pasar</div><div className="act"><b onClick=${()=>onAct('save')}>♥</b>Guardar perfil</div><div className="act big"><b onClick=${()=>onAct('like')}>👍</b>Me interesa</div></div>
   <button className="btn" onClick=${onOpen}>Ver portafolio completo ›</button>
  </div></div>`;
}
