import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';

export function Messages({jobs,pros,chats,setView,getContact}){
 return html`<div><h2>Mensajes</h2><p className="mut">Respuestas automáticas simuladas para recorrer la conversación.</p>${jobs.map(j=>{const p=getContact?getContact(j):pros.find(x=>x.id===j.pid);const m=(chats[j.id||j.pid]||[]).slice(-1)[0];return html`<button key=${j.id||j.pid} className="card row message-row" onClick=${()=>setView({t:'chat',id:j.id||j.pid})}><div className="av">${p?.e||'🏗️'}</div><div style=${{flex:1}}><b>${p?.name||'Participante de MATCHTER'}</b><div className="mut">${m?m.t:'Inicia la conversación'}</div><div className="mut">${j.project}</div></div></button>`})}${jobs.length===0&&html`<p className="mut">Cuando una solicitud privada sea aceptada o haya interés en un proyecto público, podrás chatear.</p>`}</div>`;
}
