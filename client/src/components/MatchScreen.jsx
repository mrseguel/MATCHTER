import React,{useState,useRef} from 'react';
import {html,Ic} from '../lib/html.js';

export function MatchScreen({p,onContract,onClose}){
 const cf=Array.from({length:28},(_,i)=>({l:(i*37)%100,d:(i*0.23)%3,t:3+(i%4),c:['#fff','#ffd23f','#2de2e6','#ff9ad5','#a7f070'][i%5]}));
 return html`<div className="mt">${cf.map((c,i)=>html`<i key=${i} className="cf" style=${{left:c.l+'%',animationDelay:c.d+'s',animationDuration:c.t+'s',background:c.c}}></i>`)}
  <h1>¡Hiciste<br/>Match!</h1>
  <div className="pair"><div className="ph l" style=${{background:'linear-gradient(160deg,#8fb3e8,#dbe8ff)'}}><${Ic} n="user"/><span className="nm">Tú</span></div><div className="hb"><${Ic} n="heart"/></div><div className="ph r" style=${{background:`linear-gradient(160deg,${p.c},#fff)`}}>${p.e}<span className="nm">${p.name.split(' ')[0]}</span></div></div>
  <p style=${{textAlign:'center',fontSize:16,margin:'0 0 20px',animation:'mfade .6s 1s both'}}>Tú y <b>${p.name}</b> quieren trabajar juntos.<br/>¡Ahora pueden conversar y cerrar el proyecto!</p>
  <button className="btn" style=${{background:'#fff',color:'#ff2d75',maxWidth:320}} onClick=${onContract}>Ver contrato</button>
  <button className="btn" style=${{background:'none',color:'#fff',border:'2px solid #fff',maxWidth:320,marginTop:10}} onClick=${onClose}>Seguir explorando</button>
 </div>`;
}
