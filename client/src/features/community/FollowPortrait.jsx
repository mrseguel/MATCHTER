import React from 'react';
import {UserRound,Plus,Check} from 'lucide-react';
import {demoPortrait} from '../../demoData.js';
export function FollowPortrait({person,photo,following=false,canFollow=false,onFollow,onProfile,variant='feed'}){
 const src=photo||demoPortrait(person)||person?.avatar||person?.img||person?.photo;
 const image=<>{src?<img src={src} alt={person?.name?'Foto de '+person.name:'Foto de perfil'}/>:<UserRound size={variant==='feed'?24:38} aria-hidden="true"/>}</>;
 const label=following?'Dejar de seguir':'Seguir';
 return <div className={'mp-follow-portrait mp-follow-'+variant}>
 {onProfile?<button type="button" className="mp-follow-image" aria-label={'Ver perfil de '+(person?.name||'autor')} onClick={onProfile}>{image}</button>:<div className="mp-follow-image">{image}</div>}
 {canFollow&&<button type="button" className="mp-follow-plus" aria-label={label+' '+(person?.name||'perfil')} aria-pressed={following} title={label} onClick={e=>{e.stopPropagation();onFollow?.()}}>{following?<Check size={variant==='feed'?13:17} strokeWidth={2.8}/>:<Plus size={variant==='feed'?14:19} strokeWidth={2.8}/>}</button>}
 </div>
}
