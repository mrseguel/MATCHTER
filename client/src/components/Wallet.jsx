import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {fmt,STAGES,CARDS} from '../data.js';
import {Overlay} from './Overlay.jsx';

export function Wallet({j,p,onBack,pay}){
 const [sel,setSel]=useState(0);const s=STAGES[j.paid];
 return html`<${Overlay} title="WALLET" onBack=${onBack}>
  <h2>Wallet de demostración</h2><div className="card"><b>${j.project} - ${p.name}</b><div><span className="tag" style=${{background:'var(--line)',color:'var(--tx)'}}>Etapa ${j.paid+1}: ${s[0]}</span></div><p>Monto de ejemplo: <b>${fmt(s[2])}</b></p><div className="tag" style=${{display:'block'}}>Simulación · No se procesa ni transfiere dinero</div></div>
  <h3>Método de pago</h3><div className="row">${CARDS.map((c,i)=>html`<div key=${i} className=${'cc'+(sel===i?' on':'')} style=${{background:c.c}} onClick=${()=>setSel(i)}><b>${c.b}</b><div style=${{margin:'18px 0 4px',fontSize:16}}>•••• ${c.l}</div>Exp: ${c.e}${i===0?' · Favorita':''}</div>`)}</div>
  <div className="card" style=${{marginTop:14}}><div className="row sp"><span>Subtotal</span><span>${fmt(s[2])}</span></div><div className="row sp"><span>Comisión de garantía</span><span>$0 CLP (Gratis)</span></div><div className="row sp" style=${{marginTop:6}}><b>Total a transferir</b><b style=${{color:'#ff5a00',fontSize:18}}>${fmt(s[2])}</b></div></div>
  <button className="btn" onClick=${()=>pay(j,s,CARDS[sel])}>Simular pago de este hito</button>
  <p className="mut" style=${{textAlign:'center'}}>Las tarjetas y montos son datos ficticios de la sesión de demo.</p>
 <//>`;
}
