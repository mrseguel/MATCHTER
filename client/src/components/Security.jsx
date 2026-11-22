import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {PSTEPS} from '../data.js';

export function Security({disputes,setDisputes,toast}){
 const d=disputes[0];
 if(!d)return html`<div><h2>Seguridad</h2><div className="card"><b>🛡️ Sin disputas activas</b><p className="mut">Todos tus proyectos están en regla. Si hay un problema, repórtalo desde el contrato.</p></div></div>`;
 const upd=f=>setDisputes(ds=>ds.map(x=>x.id===d.id?f(x):x));
 const CH=['Describir el inconveniente de manera objetiva','Aportar evidencias de la obra o pagos','Participar en la llamada de mediación','Revisar y firmar la propuesta de acuerdo final'];
 return html`<div><h2>Resolución de Problemas</h2>
  <div className="card"><div className="row sp"><b>Caso #${d.id} - ${d.title}</b><span className=${'tag '+(d.step>=3?'g':'')}>${d.step>=3?'RESUELTO':'DISPUTA ACTIVA'}</span></div><div className="mut">from ${d.from} (en proyecto)</div>
   <div className="step">${PSTEPS.map((s,i)=>html`<div key=${i} style=${{textAlign:'center',flex:1,fontSize:11}}><div className=${'dot '+(i<d.step?'c':i===d.step?'d':'')} style=${{margin:'0 auto 4px'}}>${i<d.step?'✓':i+1}</div>${i+1}. ${s}</div>`)}</div></div>
  <h3>1. Canales de apoyo y mediación</h3>
  <div className="row" style=${{alignItems:'stretch'}}><div className="card" style=${{flex:1,background:'#e3f8ea'}}><b style=${{fontSize:13}}>💬 Mediación de demostración</b><button className="btn gr sm" style=${{marginTop:8}} disabled=${!!d.mediatorRequested} onClick=${()=>{upd(x=>({...x,mediatorRequested:true}));toast('Solicitud de mediación registrada en esta sesión')}}>${d.mediatorRequested?'Solicitud registrada':'Solicitar mediación (demo)'}</button></div><div className="card" style=${{flex:1}}><b style=${{fontSize:13}}>📅 Llamada de ejemplo</b><div className="mut">Horario ficticio · sin reserva real</div><button className="btn sm" style=${{marginTop:6}} onClick=${()=>{upd(x=>({...x,conf:true}));toast('Asistencia de ejemplo confirmada')}}>${d.conf?'✔ Confirmada':'Confirmar asistencia'}</button></div></div>
  <h3>2. Carga de evidencias</h3>
  <div className="card" style=${{border:'1.5px dashed #2563eb',textAlign:'center'}}><div style=${{fontSize:30}}>⬆️</div><div className="mut">Evidencias de ejemplo para esta sesión</div><button className="btn sm" style=${{marginTop:8}} onClick=${()=>upd(x=>({...x,files:[...x.files,'Evidencia_demo_'+(x.files.length+1)+'.jpg']}))}>Agregar evidencia de ejemplo</button><div className="mut">No se seleccionan ni suben archivos reales.</div></div>
  ${d.files.map((f,i)=>html`<div key=${f+i} className="card row sp" style=${{padding:10,marginBottom:8}}><span>📎 ${f} <span className="mut">· ● subido</span></span><button className="chip" onClick=${()=>upd(x=>({...x,files:x.files.filter((_,k)=>k!==i)}))}>🗑</button></div>`)}
  <h3>3. Pasos para la resolución</h3>
  ${CH.map((c,i)=>html`<label key=${i} className="row" style=${{margin:'8px 0',fontSize:14}}><input type="checkbox" checked=${!!d.checks[i]} onChange=${()=>upd(x=>({...x,checks:x.checks.map((v,k)=>k===i?!v:v)}))}/> ${i+1}. ${c}</label>`)}
  <div className="card" style=${{background:'#dbe8ff',color:'#1e3a8a'}}>ⓘ La mediación es imparcial y busca un acuerdo justo para ambas partes.</div></div>`;
}

/* ---------- Admin ---------- */
