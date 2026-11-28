(()=>{
const root=document.getElementById('root');if(!root)return;
const norm=s=>s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const visual='<div class="mw-visual"><header class="mw-header"><div class="mw-wordmark">MATCHTER</div><h1 class="mw-headline">El ecosistema de la construcción<br>que conecta personas,<span>proyectos y oportunidades.</span></h1><svg class="mw-swoosh" viewBox="0 0 160 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 12 Q75 -9 160 7 Q78 -1 0 12Z" fill="#ff6b00"/></svg></header><div class="mw-hero" role="img" aria-label="Contratista y cliente se estrechan la mano frente a una casa moderna al atardecer"></div><section class="mw-features" aria-label="Funciones de Matchter"><div class="mw-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><style>@keyframes mw-swipe-slide{0%,18%,100%{transform:translateX(0)}42%,56%{transform:translateX(3.5px)}78%{transform:translateX(-2.2px)}}.mw-swipe-front{animation:mw-swipe-slide 3s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.mw-swipe-front{animation:none}}</style><rect x="2.8" y="3.6" width="10.5" height="17" rx="1.8" transform="rotate(-8 8 12.1)"/><g class="mw-swipe-front"><rect x="8.5" y="3.6" width="10.5" height="17" rx="1.8" transform="rotate(8 13.75 12.1)" style="fill:#081522"/></g></svg><span style="display:block;width:100%;min-width:0"><strong style="display:block;font-size:1.14em;line-height:1.12;font-weight:800;letter-spacing:.15px;margin-bottom:4px">SWIPE</strong><span style="display:block;font-size:.94em;font-weight:500;line-height:1.25;overflow-wrap:normal">Descubre profesionales deslizando perfiles</span></span></div><div class="mw-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/></svg><span style="display:block;width:100%;min-width:0"><strong style="display:block;font-size:1.14em;line-height:1.12;font-weight:800;letter-spacing:.15px;margin-bottom:4px">Cot<span style="color:#ff790c">I</span>z<span style="color:#ff790c">A</span></strong><span style="display:block;font-size:.94em;font-weight:500;line-height:1.25;overflow-wrap:normal">Conoce los precios reales de cada partida</span></span></div><div class="mw-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><style>@keyframes mw-play-feed-scroll{0%,23%{transform:translateY(0px)}33%,56%{transform:translateY(-24px)}66%,89%{transform:translateY(-48px)}99%,100%{transform:translateY(-72px)}}.mw-play-feed-track{animation:mw-play-feed-scroll 6s cubic-bezier(.45,0,.25,1) infinite}@media(prefers-reduced-motion:reduce){.mw-play-feed-track{animation:none}}</style><defs><clipPath id="mw-play-feed-clip"><rect x="0" y="0" width="24" height="24" style="fill:white;stroke:none"/></clipPath></defs><g clip-path="url(#mw-play-feed-clip)"><g class="mw-play-feed-track"><g><rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></g><g transform="translate(0 24)"><path d="M10 17V5l9-2v12M10 8l9-2"/><ellipse cx="7" cy="17" rx="3" ry="2.5"/><ellipse cx="16" cy="15" rx="3" ry="2.5"/></g><g transform="translate(0 48)"><circle cx="12" cy="12" r="9"/><path d="M8 14.5q4 4 8 0M9 9h.01M15 9h.01" style="stroke-linecap:round"/></g><g transform="translate(0 72)"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></g></g></g></svg><span style="display:block;width:100%;min-width:0"><strong style="display:block;font-size:1.14em;line-height:1.12;font-weight:800;letter-spacing:.15px;margin-bottom:4px">PLAY</strong><span style="display:block;font-size:.94em;font-weight:500;line-height:1.25;overflow-wrap:normal">Mira videos y conecta con creadores de contenido</span></span></div><div class="mw-feature"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18m-11-1v3h4v-3"/></svg><span style="display:block;width:100%;min-width:0"><strong style="display:block;font-size:1.14em;line-height:1.12;font-weight:800;letter-spacing:.15px;margin-bottom:4px">WORKS</strong><span style="display:block;font-size:.94em;font-weight:500;line-height:1.25;overflow-wrap:normal">Busca y ofrece empleos de forma rápida y segura</span></span></div></section></div>';
const footer='<footer class="mw-footer"><span>Términos de uso</span><i aria-hidden="true"></i><span>Privacidad</span></footer>';
let active=null,wordmarkPlayed=false;
function animateWordmark(ban){
 const mark=ban.querySelector('.mw-wordmark');
 if(!mark||wordmarkPlayed)return;
 wordmarkPlayed=true;
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!Element.prototype.animate)return;
 const original=mark.textContent,upper=original===original.toUpperCase(),spell=s=>upper?s.toUpperCase():s;
 const letters={ma:spell('Ma'),s:spell('s'),t:spell('t'),er:spell('er'),ch:spell('ch'),ter:spell('ter')};
 const words=[['ma','s','t','er'],['ma','t','ch'],['ma','t','ch','ter']];
 // Measure each word with the logo's own font, tracking and responsive size.
 // Shared segments stay on the same visual layer; only the changing letters dissolve.
 const center=mark.getBoundingClientRect().left+mark.getBoundingClientRect().width/2;
 mark.classList.add('mw-wordmark-animated');
 mark.setAttribute('aria-label',original);mark.setAttribute('role','img');
 const poses=words.map(parts=>{
  const measure=document.createElement('span');measure.className='mw-wordmark-measure';measure.setAttribute('aria-hidden','true');
  const spans=parts.map(k=>{const e=document.createElement('span');e.textContent=letters[k];measure.appendChild(e);return [k,e]});
  mark.appendChild(measure);
  const positions=Object.fromEntries(spans.map(([k,e])=>[k,e.getBoundingClientRect().left-center]));
  measure.remove();return positions;
 });
 const [master,match,final]=poses;
 const sizer=document.createElement('span');sizer.className='mw-wordmark-sizer';sizer.textContent=original;sizer.setAttribute('aria-hidden','true');
 mark.replaceChildren(sizer);
 const duration=4000,holdMaster=1200,firstEnd=2000,holdMatch=3100,secondEnd=3850;
 const curve='cubic-bezier(.42,0,.22,1)';
 const frame=(ms,x,opacity=1,y=0,blur=0)=>({offset:ms/duration,transform:'translate('+x+'px,'+y+'px)',opacity,filter:'blur('+blur+'px)',easing:curve});
 const track=(k,frames)=>{
  const el=document.createElement('span');el.className='mw-wordmark-letter';el.setAttribute('aria-hidden','true');el.textContent=letters[k];mark.appendChild(el);
  return el.animate(frames,{duration,fill:'both'});
 };
 const animations=[
  ...['ma','t'].map(k=>track(k,[frame(0,master[k]),frame(holdMaster,master[k]),frame(firstEnd,match[k]),frame(holdMatch,match[k]),frame(secondEnd,final[k]),frame(duration,final[k])])),
  track('s',[frame(0,master.s),frame(holdMaster,master.s),frame(1600,match.t,0.38,-1,1.6),frame(firstEnd,match.t,0,-3,2),frame(duration,match.t,0,-3,2)]),
  track('er',[frame(0,master.er),frame(holdMaster,master.er),frame(1600,match.ch,0.38,0,1.6),frame(firstEnd,match.ch,0,-3,2),frame(duration,match.ch,0,-3,2)]),
  track('ch',[frame(0,master.er,0,2,2),frame(holdMaster,master.er,0,2,2),frame(1600,match.ch,0.62,0,1.2),frame(firstEnd,match.ch),frame(holdMatch,match.ch),frame(secondEnd,final.ch),frame(duration,final.ch)]),
  track('ter',[frame(0,final.ter-6,0,2,2),frame(holdMatch,final.ter-6,0,2,2),frame(3500,final.ter-2,0.6,0,1),frame(secondEnd,final.ter),frame(duration,final.ter)])
 ];
 // Restore the literal original mark after the morph. No layout or style changes remain.
 let timer;
 const finish=()=>{if(!mark.classList.contains('mw-wordmark-animated'))return;clearTimeout(timer);for(const a of animations)a.cancel();mark.textContent=original;mark.classList.remove('mw-wordmark-animated');mark.removeAttribute('aria-label');mark.removeAttribute('role');window.removeEventListener('resize',finish)};
 animations[0].finished.then(finish,()=>{});
 timer=setTimeout(finish,duration+250);
 // Orientation changes can alter responsive type measurements.
 window.addEventListener('resize',finish,{once:true});
}
function clear(){if(!active)return;const {app,main,ban,row,created,login}=active;app.classList.remove('mw-app');main.classList.remove('mw-main');ban.classList.remove('mw-ban');row.classList.remove('mw-actions');created.classList.remove('mw-create');login.classList.remove('mw-login');ban.querySelector('.mw-visual')?.remove();ban.querySelector('.mw-footer')?.remove();active=null}
function update(){let found=null;for(const ban of root.querySelectorAll('.app .main .ban')){const buttons=[...ban.querySelectorAll('button')];const created=buttons.find(x=>norm(x.textContent)==='crear cuenta');const login=buttons.find(x=>norm(x.textContent)==='iniciar sesion');const row=created?.parentElement;if(!created||!login||!row||login.parentElement!==row||row.parentElement!==ban)continue;const main=ban.closest('.main'),app=main?.closest('.app');if(main&&app&&ban.parentElement===main){found={app,main,ban,row,created,login};break}}
if(!found){clear();return}if(active&&active.ban!==found.ban)clear();active=found;const {app,main,ban,row,created,login}=found;app.classList.add('mw-app');main.classList.add('mw-main');ban.classList.add('mw-ban');row.classList.add('mw-actions');created.classList.add('mw-create');login.classList.add('mw-login');if(!ban.querySelector(':scope > .mw-visual'))row.insertAdjacentHTML('beforebegin',visual);animateWordmark(ban);if(!ban.querySelector(':scope > .mw-footer'))row.insertAdjacentHTML('afterend',footer)}
new MutationObserver(update).observe(root,{childList:true,subtree:true});update();
})();