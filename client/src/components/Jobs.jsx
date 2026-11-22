import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';

export function Jobs({jobs,pros,setView,getContact}){
 return html`<div><h2>Mis Trabajos</h2>${jobs.length===0&&html`<p className="mut">Aún no tienes matches. Desliza en Explorar.</p>`}
 ${jobs.map(j=>{const p=getContact?getContact(j):pros.find(x=>x.id===j.pid);return html`<div key=${j.id||j.pid} className="card"><div className="row"><div className="av">${p?.e||'🏗️'}</div><div style=${{flex:1}}><b>${j.project}</b><div className="mut">${p?.name||'Participante de MATCHTER'}</div></div><span className=${'tag '+(j.signed?'g':'')}>${j.signed?'Firmado · demo':'Por firmar'}</span></div>
  <div className="row" style=${{marginTop:10}}><div className="bar"><i style=${{width:(j.paid/3*100)+'%'}}></i></div><span className="mut">${j.paid}/3 etapas pagadas</span></div>
  <div className="row" style=${{marginTop:10}}><button className="btn sm" onClick=${()=>setView({t:'contract',id:j.id||j.pid})}>Ver contrato</button><button className="btn sm out" onClick=${()=>setView({t:'chat',id:j.id||j.pid})}>Mensaje</button></div></div>`})}</div>`;
}
