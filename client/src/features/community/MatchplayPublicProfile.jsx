import React,{useState} from 'react';
import {ArrowLeft,MoreHorizontal,MessageCircle,Grid3X3,ChevronRight,Play,Star,BadgeCheck,UserRound,X} from 'lucide-react';
import {demoPortrait} from '../../demoData.js';
import './matchplay-public-profile.css';
export function MatchplayPublicProfile({author,posts,isProvider,canQuote,canMessage,onBack,onOptions,onProfessional,onMessage,onQuote}){
 const [quote,setQuote]=useState(false),[ratingOpen,setRatingOpen]=useState(false),[video,setVideo]=useState(null);
 const photo=demoPortrait(author)||author.avatar||author.img||author.photo;
 const rating=Number(author.r??author.rating),count=Number(author.n??author.reviewCount??0);
 const reviews=Array.isArray(author.publicReviews)?author.publicReviews:Array.isArray(author.reviews)?author.reviews.filter(r=>r.public!==false):[];
 const submit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);const work=String(data.get('work')||'').trim(),location=String(data.get('location')||'').trim();if(!work||!location)return;const body='Solicitud de cotización\\nTrabajo: '+work+'\\nUbicación: '+location+(data.get('details')?'\\nAntecedentes: '+data.get('details'):'');onQuote(body.slice(0,1000));};
 return <section className="mp-public" aria-label="Perfil público de MATCHPLAY">
 <header className="mp-public-header"><button type="button" aria-label="Volver a los videos" onClick={onBack}><ArrowLeft size={22}/></button><span>MATCHPLAY</span><button type="button" aria-label="Opciones de MATCHPLAY" onClick={onOptions}><MoreHorizontal size={22}/></button></header>
 <div className="mp-public-scroll"><div className="mp-public-info">
 <div className="mp-avatar">{photo?<img src={photo} alt="Foto de perfil" onError={e=>{e.currentTarget.style.display='none'}}/>:<UserRound size={42}/>}</div>
 <h2>{author.name}{(author.ver||author.verified===true)&&<BadgeCheck className="mp-verified" size={20} aria-label="Perfil verificado"/>}</h2>
 <div className="mp-role">{[author.role,author.loc].filter(Boolean).join(' · ')}</div>
 {(author.cat||author.bio)&&<div className="mp-bio">{author.cat||author.bio}</div>}
 {Number.isFinite(rating)&&<button className="mp-rating" onClick={()=>setRatingOpen(x=>!x)} aria-expanded={ratingOpen}><span className="mp-stars">{[1,2,3,4,5].map(n=><Star key={n} size={15} fill={rating>=n-.5?'currentColor':'none'}/>)}</span><strong>{rating.toLocaleString('es-CL',{maximumFractionDigits:1})}/5</strong><small>· {count} calificaciones</small><ChevronRight size={15}/></button>}
 {ratingOpen&&<div className="mp-rating-detail"><strong>Calificaciones y comentarios</strong>{reviews.length?reviews.map((r,i)=><p key={r.id||i}>{r.rating?String(r.rating)+' / 5 · ':''}{r.comment||r.text||''}</p>):<p>Valoración referencial de la demo. Los comentarios individuales no están disponibles.</p>}{isProvider&&<button className="mp-message" onClick={onProfessional}>Ver reputación y transparencia</button>}</div>}
 <div className="mp-primary">{isProvider&&<button className="mp-professional" onClick={onProfessional}>Ver perfil profesional</button>}{canQuote&&<button className="mp-quote" onClick={()=>setQuote(true)}>Cotizar</button>}</div>
 {canMessage&&<button className="mp-message" onClick={onMessage}><MessageCircle size={16}/>Mensaje</button>}
 </div>
 <div className="mp-video-header"><Grid3X3 size={16}/><strong>Videos</strong><small>{posts.length} publicaciones</small></div>
 <div className="mp-grid">{posts.map(post=><button key={post.id} className="mp-tile" onClick={()=>setVideo(post)} aria-label={'Ver video: '+post.caption}>{post.poster?<img src={post.poster} alt=""/>:post.url?<video src={post.url+'#t=0.1'} preload="metadata" muted playsInline/>:null}<span><Play size={16} fill="currentColor"/></span></button>)}</div>
 {!posts.length&&<p className="mp-empty">Este perfil aún no ha publicado videos.</p>}
 </div>
 {quote&&<div className="mp-layer"><form className="mp-dialog" onSubmit={submit}><div className="mp-dialog-head"><strong>Solicitar cotización</strong><button type="button" onClick={()=>setQuote(false)} aria-label="Cerrar"><X size={20}/></button></div><p>Para {author.name}</p><label>¿Qué trabajo necesitas?<textarea name="work" required maxLength={550} placeholder="Describe brevemente el servicio"/></label><label>Ubicación<input name="location" required maxLength={120} placeholder="Comuna o sector"/></label><label>Antecedentes adicionales (opcional)<textarea name="details" maxLength={220} placeholder="Medidas, plazo u otros detalles"/></label><button className="mp-quote" type="submit">Enviar solicitud</button><small>Se envía como solicitud de mensaje, no genera un Match automático.</small></form></div>}
 {video&&<div className="mp-layer mp-watch"><div className="mp-dialog"><div className="mp-dialog-head"><strong>MATCHPLAY</strong><button onClick={()=>setVideo(null)} aria-label="Volver al perfil"><X size={20}/></button></div><video src={video.url} controls autoPlay playsInline/><p>{video.caption}</p>{video.sample&&<small>Video ilustrativo · {video.credit} / Pexels</small>}</div></div>}
 </section>;
}