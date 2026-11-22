import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {CATS,ICO,km,FL0,okp} from '../data.js';
import {SwipeCard} from './SwipeCard.jsx';

export function Explore({pros,seen,act,setView,saved,filt,setFilt,fl,setFl}){
 const vis=pros.filter(p=>okp(p,fl));const deck=vis.filter(p=>!seen.includes(p.id));const top=deck[0];
 const tg=k=>setFl(f=>({...f,[k]:!f[k]}));
 const tc=c=>setFl(f=>({...f,cats:f.cats.includes(c)?f.cats.filter(x=>x!==c):[...f.cats,c]}));
 const Opt=(k,ic,l)=>html`<button className=${'chip'+(fl[k]?' on':'')} onClick=${()=>tg(k)}>${ic} ${l}</button>`;
 return html`<div className="ex">
  <div className="chips" style=${{flex:'none'}}><button className=${'chip'+(fl.cats.length?'':' on')} onClick=${()=>setFl(f=>({...f,cats:[]}))}>${ICO.Todos} Todos</button>${CATS.slice(1).map(c=>html`<button key=${c} className=${'chip'+(fl.cats.includes(c)?' on':'')} onClick=${()=>tc(c)}>${ICO[c]} ${c}</button>`)}</div>
  <div className="deck">${top?html`<${SwipeCard} key=${top.id} p=${top} onAct=${t=>act(top,t)} onOpen=${()=>setView({t:'pro',id:top.id})}/>`:html`<div className="card" style=${{textAlign:'center',marginTop:40}}><div style=${{fontSize:60}}>🏁</div><b>${vis.length?'No hay más profesionales por ahora':'Sin resultados con estos filtros'}</b><p className="mut">Cambia los filtros o revisa tus perfiles guardados (${saved.length}).</p><button className="btn sm" onClick=${()=>setFl(FL0)}>Limpiar filtros</button></div>`}</div>
  ${filt&&html`<div className="fp"><div className="row sp"><b style=${{fontSize:18}}>Filtros</b><button className="chip" onClick=${()=>setFl(FL0)}>Limpiar</button></div><div className="mut">Puedes elegir varias opciones a la vez</div>
   <h4>Disponibilidad y confianza</h4><div className="wrap">${Opt('inm','⚡','Disponibilidad inmediata')}${Opt('ver','🛡️','Profesionales verificados')}${Opt('top','⭐','Mejor calificados')}${Opt('emp','🏢','Solo empresas')}</div>
   <h4>Distancia</h4><div className="wrap">${[3,5,10].map(d=>html`<button key=${d} className=${'chip'+(fl.dist===d?' on':'')} onClick=${()=>setFl(f=>({...f,dist:f.dist===d?0:d}))}>📍 Hasta ${d} km</button>`)}</div>
   <h4>Especialidades</h4><div className="wrap">${CATS.slice(1).map(c=>html`<button key=${c} className=${'chip'+(fl.cats.includes(c)?' on':'')} onClick=${()=>tc(c)}>${ICO[c]} ${c}</button>`)}</div>
   <button className="btn" style=${{marginTop:16}} onClick=${()=>setFilt(false)}>Ver ${deck.length} resultado${deck.length===1?'':'s'}</button></div>`}
 </div>`;
}
