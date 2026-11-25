import React,{useLayoutEffect,useRef} from 'react';
import {ExploreActionBar} from '../../approved/visual.js';
import './explore-profile-shell.css';
const normalize=s=>s.trim().toLowerCase().replace(/[^a-záéíóúüñ ]/g,'').replace(/\s+/g,' ').trim();
export function ExploreProfileShell({active,profile,onAction,onBack,fallbackBack,children}){
 const body=useRef(null);
 useLayoutEffect(()=>{
  if(!active||!body.current)return;const root=body.current;
  function clean(){
   root.querySelectorAll('button').forEach(b=>{const t=normalize(b.textContent||'');if(t==='me interesa'||t==='me gusta')b.classList.add('matchter-old-profile-action')});
   root.querySelectorAll('.acts,.profile-actions,.portfolio-actions,.profile-action-bar').forEach(el=>{const t=normalize(el.textContent||'');if(t.includes('pasar')&&(t.includes('favoritos')||t.includes('guardar perfil'))&&(t.includes('me interesa')||t.includes('me gusta')))el.classList.add('matchter-old-profile-action')});
  }
  clean();const obs=new MutationObserver(clean);obs.observe(root,{childList:true,subtree:true});return()=>obs.disconnect();
 },[active,profile?.id]);
 if(!active||!profile)return children;
 const child=React.isValidElement(children)?children:React.Children.only(children);
 return <div className="matchter-explore-shell"><div className="matchter-explore-body" ref={body}>{React.cloneElement(child,{onBack:onBack||child.props.onBack||fallbackBack})}</div><div className="matchter-explore-actions" role="group" aria-label="Acciones del perfil"><ExploreActionBar p={profile} onAct={onAction}/></div></div>;
}