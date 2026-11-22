import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {Overlay} from './Overlay.jsx';

export function Chat({p,msgs,send,onBack}){
 const [t,setT]=useState('');
 const go=()=>{if(!t.trim())return;send(t.trim());setT('')};
 return html`<${Overlay} title=${p.name} onBack=${onBack}>
  <div style=${{minHeight:320}}>${(msgs||[]).map((m,i)=>html`<div key=${i} className=${'msg'+(m.me?' me':'')}>${m.t}</div>`)}</div>
  <div className="row"><input type="text" value=${t} placeholder="Escribe un mensaje…" onChange=${e=>setT(e.target.value)} onKeyDown=${e=>e.key==='Enter'&&go()}/><button className="btn sm" onClick=${go}>Enviar</button></div>
 <//>`;
}
