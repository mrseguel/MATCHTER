import React,{useState,useMemo} from 'react';
import {Search,ArrowLeft,UserRound,Play,X} from 'lucide-react';
import {demoPortrait} from '../../demoData.js';
export const normalizeSearch=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function searchMatchplay(people,posts,query){
 const terms=normalizeSearch(query).split(/\s+/).filter(Boolean);
 const match=values=>{const haystack=normalizeSearch(values.filter(Boolean).join(' '));return terms.every(t=>haystack.includes(t))};
 const byId=new Map(people.map(p=>[String(p.id),p]));
 return {people:people.filter(p=>match([p.name,p.role,p.cat,p.loc,p.bio])),posts:posts.filter(p=>{const a=byId.get(String(p.author));return match([p.caption,p.category,a?.name,a?.role,a?.cat,a?.loc])})};
}
export function MatchplaySearch({people,posts,onClose,onProfile,onVideo}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const result=useMemo(()=>searchMatchplay(people,posts,query),[people,posts,query]);
 const hasQuery=!!query.trim();
 return <section className="mp-search-screen" aria-label="Buscar en MATCHPLAY"><header className="mp-search-header"><button aria-label="Volver" onClick={onClose}><ArrowLeft size={22}/></button><div className="mp-search-input"><Search size={19}/><input type="search" autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar videos, perfiles, especialidades..." aria-label="Buscar en MATCHPLAY"/>{query&&<button aria-label="Borrar búsqueda" onClick={()=>setQuery('')}><X size={17}/></button>}</div></header>
 <div className="mp-search-tabs">{[['all','Todo'],['people','Perfiles'],['videos','Videos']].map(([k,l])=><button key={k} className={filter===k?'selected':''} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div>
 <div className="mp-search-results">{!hasQuery?<div className="mp-search-suggestions"><h3>Explora MATCHPLAY</h3><p>Encuentra personas, trabajos y publicaciones por nombre, oficio o descripción.</p><div>{['Carpintería','Construcción','Pintura','Remodelación','Temuco'].map(q=><button key={q} onClick={()=>setQuery(q)}><Search size={14}/>{q}</button>)}</div></div>:<>
 {filter!=='videos'&&<section><h3>Perfiles <small>{result.people.length}</small></h3>{result.people.length?result.people.map(p=><button className="mp-search-person" key={p.id} onClick={()=>onProfile(p.id)}><span className="mp-search-avatar">{demoPortrait(p)?<img src={demoPortrait(p)} alt=""/>:<UserRound size={24}/>}</span><span><b>{p.name}</b><small>{[p.role,p.cat,p.loc].filter(Boolean).join(' · ')}</small></span><span aria-hidden="true">›</span></button>):<p className="mp-search-empty">No se encontraron perfiles.</p>}</section>}
 {filter!=='people'&&<section><h3>Videos <small>{result.posts.length}</small></h3>{result.posts.length?<div className="mp-search-grid">{result.posts.map(p=><button key={p.id} onClick={()=>onVideo(p.id)} className="mp-search-video"><div className="mp-search-preview">{p.url?<video src={p.url} muted playsInline preload="metadata"/>:<Play size={28}/>}<span><Play size={14} fill="currentColor"/></span></div><b>{p.caption||'Publicación'}</b><small>{people.find(a=>String(a.id)===String(p.author))?.name||'Perfil'} · {p.category}</small></button>)}</div>:<p className="mp-search-empty">No se encontraron videos.</p>}</section>}
 </>}</div></section>
}
