import React,{useState} from 'react';
import {ShieldCheck,FileText,Lock,Paperclip} from 'lucide-react';
import {documentTypes,requestDocuments,shareSampleDocument} from './documents.js';
export function DocumentPanel({application:a,company,role,person,state,setState}){
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[consents,setConsents]=useState({});
 const run=(fn,msg)=>{try{setState(fn());setError('');setNotice(msg)}catch(e){setError(e.message);setNotice('')}};
 return <section className="emp-docs"><h4><ShieldCheck size={17}/> Documentación privada</h4><p className="mut">{company?'Solicita solo los documentos necesarios para una vacante preseleccionada. El certificado de antecedentes requiere una justificación legal vinculada al cargo.':'Los archivos solo se habilitan si la empresa te preselecciona y los solicita. No se adjuntan al currículum inicial.'}</p>
 {company&&a.status!=='Preseleccionada'&&<p className="emp-doc-lock"><Lock size={14}/> Preselecciona a la persona para solicitar documentos.</p>}
 {documentTypes.map(([type,label])=>{const doc=a.documents?.[type];return <div className="emp-doc-row" key={type}><div className="emp-section-head"><b>{label}</b><small className="emp-tag">{doc?.status||'No solicitado'}</small></div>
 {company?<>{!doc&&<button className="btn out sm" disabled={a.status!=='Preseleccionada'} onClick={()=>run(()=>requestDocuments(state,person,role,a.id,[type]),'Solicitud de prueba enviada al postulante.')}>Solicitar {type==='identity'?'cédula':'certificado'}</button>}{doc?.sample&&<p className="mut"><FileText size={14}/> {doc.filename} · archivo simulado, sin datos reales.</p>}</>:<>{doc?.status==='Solicitado'&&a.status==='Preseleccionada'?<><label className="emp-check"><input type="checkbox" checked={!!consents[type]} onChange={e=>setConsents(v=>({...v,[type]:e.target.checked}))}/> Autorizo compartir este documento de prueba únicamente con la empresa que lo solicitó.</label><button className="btn out sm" disabled={!consents[type]} onClick={()=>run(()=>shareSampleDocument(state,person,role,a.id,type,!!consents[type]),'Documento ficticio adjuntado en esta sesión.')}><Paperclip size={15}/> Adjuntar {type==='identity'?'cédula':'certificado'} de ejemplo</button></>:doc?.sample?<p className="mut">{doc.filename} · archivo simulado.</p>:<p className="emp-doc-lock"><Lock size={14}/> Pendiente de solicitud de empresa</p>}</>}
 </div>})}
 {error&&<p className="emp-error" role="alert">{error}</p>}{notice&&<p className="emp-success" role="status">{notice}</p>}
 <small className="mut">Modo demostración: no admite archivos de identidad ni antecedentes reales. El envío privado y seguro requiere autenticación y almacenamiento definitivo.</small></section>
}
