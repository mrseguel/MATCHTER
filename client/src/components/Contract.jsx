import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';
import {fmt,STAGES} from '../data.js';
import {Overlay} from './Overlay.jsx';

export function Contract({j,p,onBack,setJobs,setView,openDispute}){
 const nxt=j.paid;
 return html`<${Overlay} title="CONTRATOS" onBack=${onBack}>
  <h2>Resumen del Acuerdo de Trabajo</h2><div className="mut">Proyecto: ${j.project} - Temuco<br/>Matched: ${p.name} (Contratista) & Cliente</div>
  <div className="card" style=${{marginTop:12}}><b style=${{fontSize:17}}>Detalle y Alcance</b><p style=${{fontSize:14}}>Ampliación de habitación de 15 m² en primer piso con estructura de madera, techumbre y terminaciones básicas.</p></div>
  <div className="card"><b style=${{fontSize:17}}>Etapas e Hitos de Pago</b>${STAGES.map((s,i)=>html`<div key=${i} className="row sp" style=${{marginTop:10}}><div><b>${i<j.paid?'✅':'⏳'} Etapa ${i+1}: ${s[0]}</b><div className="mut">Estimada: ${s[1]} · Pago sujeto a conformidad</div></div><b style=${{fontSize:13}}>${fmt(s[2])}</b></div>`)}</div>
  <div className="card row sp"><div><div className="mut">Fecha de inicio</div><b>01 Dic 2026</b></div><div><div className="mut">Término estimado</div><b>30 Ene 2027</b></div></div>
  <div className="card" style=${{border:'2px solid #2563eb'}}><b style=${{fontSize:17}}>Acuerdo de demostración</b><div className="tag" style=${{display:'block',margin:'8px 0'}}>Simulación · No crea una firma ni un contrato legal</div>
   ${[['Validación de identidad (ClaveÚnica / Cédula)',1],['Firma del contratista',1],['Tu firma digital',j.signed?1:0],['Certificación notarial automatizada',j.signed?1:0]].map(([t,d],i)=>html`<div key=${i} style=${{fontSize:14,margin:'5px 0'}}>${d?'✅':(i===2?'🔵':'⚪')} ${i+1}. ${t} ${i===2&&!j.signed?html`<span style=${{color:'#2563eb'}}>(Pendiente)</span>`:''}</div>`)}</div>
  ${!j.signed?html`<button className="btn" onClick=${()=>setJobs(js=>js.map(x=>(x.id||x.pid)===(j.id||j.pid)?{...x,signed:true}:x))}>Marcar acuerdo como aceptado (demo)</button>`
  :nxt<3?html`<button className="btn gr" onClick=${()=>setView({t:'wallet',id:j.id||j.pid})}>Simular etapa ${nxt+1} · ${fmt(STAGES[nxt][2])}</button>`:html`<div className="tag g">Hitos de demostración completados</div>`}
  <p className="mut" style=${{textAlign:'center'}}>Los estados y montos son ficticios. No se contacta una notaría ni un proveedor de pago.</p>
  <button className="btn out" onClick=${()=>openDispute(j)}>⚠️ Reportar un problema</button>
 <//>`;
}
