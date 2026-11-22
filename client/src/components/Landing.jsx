import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {TYPES} from '../data.js';

export function Landing({onEnter}){
 const [auth,setAuth]=useState(null);const [more,setMore]=useState(false);
 const SP=['Carpintería','Electricidad','Gasfitería','Herrería','Pintura'].concat(more?['Albañilería','Techumbre','Cerámica','Climatización']:[]);
 return html`<div className="app"><div className="main" style=${{paddingBottom:0}}>
  <div className="logo" style=${{textAlign:'center',fontSize:26,margin:'4px 0 12px'}}>MATCHTER</div>
  <div className="ban"><div className="art" aria-hidden="true"></div><h1>¡Encuentra al profesional de construcción perfecto en Temuco!</h1><p>Descubre, evalúa y contrata con confianza. Tu proyecto comienza aquí.</p>
   <div className="row"><button className="b1" onClick=${()=>setAuth('Crear cuenta')}>Crear cuenta</button><button className="b2" onClick=${()=>setAuth('Iniciar sesión')}>Iniciar sesión</button></div></div>
  <h3>¡MATCHTER en cifras!</h3>
  <div className="st3"><div><b>1,500+ 🛡️</b>Profesionales verificados</div><div><b>500+ ✔</b>Proyectos completados en Temuco</div><div><b>4.8/5 ⭐</b>Calificación promedio</div></div>
  <h3 style=${{marginBottom:2}}>Diferencias clave</h3><div className="mut" style=${{marginBottom:8}}>Más que recomendaciones, confianza real</div>
  <div className="tiles"><div className="tile">📷 Portafolios visibles</div><div className="tile">🏅 Calificaciones verificadas</div><div className="tile">🔒 Pago protegido</div></div>
  <h3>Especialidades disponibles</h3><div className="wrap">${SP.map(s=>html`<span key=${s} className="ochip">${s}</span>`)}</div>
  <button className="btn out" style=${{marginTop:12}} onClick=${()=>setMore(m=>!m)}>${more?'Ver menos ‹':'Ver todas ›'}</button>
  <h3>Destacados de la semana</h3>
  <div className="row" style=${{alignItems:'stretch',paddingBottom:16}}><div className="card" style=${{flex:1.4,background:'var(--soft)',marginBottom:0}}><b>⭐ Top profesionales</b><div style=${{fontSize:12,marginTop:8}}>🧑‍🔧 Juan Pérez · Maestro mayor<br/>⭐ 4.9 · 18 trabajos<br/><br/>👩‍💼 María Gómez · Arquitecta<br/>⭐ 4.9 · 18 trabajos</div></div><div className="card" style=${{flex:1,background:'var(--soft)',marginBottom:0}}><b>🛡️ Reclamos resueltos</b><div style=${{fontSize:12,marginTop:8}}>Proceso transparente y mediación garantizada.</div></div></div>
  </div><button className="cta" onClick=${()=>setAuth('Crear cuenta')}>Comienza tu proyecto en Temuco hoy ›</button>
  ${auth&&html`<div className="modal" style=${{alignItems:'flex-end',padding:0}} onClick=${()=>setAuth(null)}><div className="sheet" onClick=${e=>e.stopPropagation()}><div className="row sp"><b style=${{fontSize:18}}>${auth}</b><button className="chip" onClick=${()=>setAuth(null)}>✕</button></div><div className="mut">Elige tu tipo de perfil</div>
   ${TYPES.map(t=>html`<button key=${t[1]} className="opt" onClick=${()=>onEnter({mode:auth,type:t[1]})}><span className="i">${t[0]}</span><span><b>${t[1]}</b><small>${t[2]}</small></span></button>`)}</div></div>`}
 </div>`;
}
