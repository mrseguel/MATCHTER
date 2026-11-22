import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {Overlay} from './Overlay.jsx';

export function ProView({p,onBack,act,onPrivateRequest}){
 return html`<${Overlay} title="Perfil Profesional" onBack=${onBack}>
  <h2>Sobre mí</h2><p style=${{fontSize:14}}>${p.name} cuenta con más de 15 años de experiencia en el rubro de la construcción en Temuco. ${p.bio}</p>
  <div className="card"><div className="row sp"><b>Portafolio de Proyectos</b><span style=${{color:'#ff5a00',fontSize:13}}>Ver todos (${p.jobs})</span></div>
   <div className="row" style=${{marginTop:10}}>${[['🏠','Ampliación en Lomas'],['🛖','Techumbre y estructura'],['🍳','Remodelación cocina']].map(([i,t])=>html`<div key=${t} style=${{flex:1,textAlign:'center',fontSize:12}}><div style=${{background:p.c,borderRadius:12,fontSize:34,padding:14}}>${i}</div>${t}</div>`)}</div></div>
  <h3>Calificaciones y Reclamos</h3>
  <div className="card row sp"><div><b style=${{fontSize:26}}>⭐ ${p.r}</b> / 5<div className="mut">(${p.n} evaluaciones)</div></div><div><b>🛡️ 0 Reclamos</b><div className="mut">Resueltos</div></div></div>
  <h3>Historial de Clientes y Empresas</h3>
  ${[['🏢','Constructora Araucanía Ltda.','29/09/2022'],['👤','Particular - Sector Poniente','12/09/2023']].map(([i,t,d])=>html`<div key=${t} className="card row"><span style=${{fontSize:26}}>${i}</span><div style=${{flex:1}}><b>${t}</b><div className="mut">${d} · Verificación</div></div><span style=${{color:'#2563eb'}}>✔</span></div>`)}
  <button className="btn out" style=${{marginTop:8}} onClick=${()=>onPrivateRequest(p)}>ENVIAR SOLICITUD PRIVADA ›</button>
  <p className="mut" style=${{textAlign:'center',marginTop:7}}>Ambas acciones envían una solicitud pendiente. No generan un Match antes de la aceptación.</p>
  <button className="btn" style=${{marginTop:8}} onClick=${()=>onPrivateRequest(p)}>ME INTERESA ›</button>
 <//>`;
}
