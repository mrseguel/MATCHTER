import React from 'react';
import {demoPortrait} from '../../demoData.js';
import {identity} from './model.js';
import './message-origin.css';
export function SocialInboxRows({actor,threads,people,onOpen}){
 const me=identity(actor?.id);
 if(!me)return null;
 const rows=Object.entries(threads).filter(([,t])=>t.participants.includes(me));
 return <>{rows.map(([key,t])=>{
  const other=t.participants.find(id=>id!==me);
  const p=people.find(x=>identity(x.id)===other);
  const photo=demoPortrait(p),last=t.messages?.at(-1);
  const status=t.status==='pending'?'Solicitud pendiente':t.status==='rejected'?'Solicitud rechazada':null;
  return <button key={key} type="button" className="card row message-social-row" onClick={()=>onOpen(other)}><span className="message-social-avatar">{photo?<img src={photo} alt="" onError={e=>{e.currentTarget.style.display='none'}}/>:(p?.name||'P').slice(0,1)}</span><span className="message-social-copy"><span className="message-social-name"><b>{p?.name||'Perfil'}</b><span className="message-origin">Match Play</span></span><span className="mut message-social-preview">{last?.body||status||'Inicia la conversación'}</span>{status&&last?.body&&<small className="mut">{status}</small>}</span></button>;
 })}</>;
}