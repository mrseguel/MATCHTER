(function(){
 const fs=require('node:fs'),parser=require('@babel/parser');
 const file='client/src/features/employment/RoleProfileHome.jsx';let s=fs.readFileSync(file,'utf8');
 const ast=parser.parse(s,{sourceType:'module',plugins:['jsx']});
 const nodes=[];function walk(x){if(!x||typeof x!=='object')return;if(x.type==='JSXElement')nodes.push(x);for(const [k,v] of Object.entries(x)){if(k==='loc'||k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}}walk(ast);
 const cls=n=>n.openingElement.attributes.find(a=>a.type==='JSXAttribute'&&a.name.name==='className')?.value?.value||'';
 const raw=n=>s.slice(n.start,n.end);
 const root=nodes.find(n=>cls(n)==='rp');if(!root)throw Error('Profile root missing');
 const header=root.children.find(n=>n.type==='JSXElement'&&cls(n).split(' ').includes('rp-header'));if(!header)throw Error('Header missing');
 const cards=root.children.filter(n=>n.type==='JSXElement'&&cls(n).split(' ').includes('card')&&n!==header);
 console.log('PROFILE DIRECT CARDS: '+cards.map(n=>cls(n)+': '+raw(n).slice(0,1400)).join('\n'));
 const possible=cards.filter(n=>/reputaci[oó]n/i.test(raw(n)));
 if(possible.length!==1)throw Error('Expected one reputation card, found '+possible.length);
 const rep=possible[0],old=raw(rep);console.log('PROFILE REPUTATION: '+old);
 const rating=old.match(/<([a-z][\w]*)\b[^>]*>\s*\{person\?\.r[^}]*\}[\s\S]*?<\/\1>/);
 let content=s.slice(rep.openingElement.end,rep.closingElement.start);
 const stars='<div className="rp-rep-stars" aria-label={person?.r!=null?`Calificación ${person.r} de 5`:"Sin calificaciones"}>{[0,1,2,3,4].map(i=><span className="rp-rep-star" key={i}><Star size={21} strokeWidth={1.5} color="#c7cbd1" fill="none"/><span style={{width:`${Math.max(0,Math.min(1,Number(person?.r||0)-i))*100}%`}}><Star size={21} strokeWidth={1.5} color="#e6a126" fill="#f5b83d"/></span></span>)}</div>';
 // Replace just the single existing star icon, when present, without changing the original rating/count text.
 const inlineStar=content.match(/<Star\b[^>]*\/>/);
 if(inlineStar){content=content.replace(inlineStar[0],stars);}
 else {
 const heading=content.match(/<h[234]\b[^>]*>[\s\S]*?<\/h[234]>/);
 if(heading)content=content.replace(heading[0],heading[0]+stars);
 else content=stars+content;
 }
 const repClass=cls(rep).split(/\s+/).filter(k=>k!=='card').join(' ');
 const integrated='<div className="'+repClass+' rp-reputation-inline">'+content+'</div>';
 const edits=[{start:rep.start,end:rep.end,text:''},{start:header.closingElement.start,end:header.closingElement.start,text:integrated}].sort((a,b)=>b.start-a.start);
 for(const e of edits)s=s.slice(0,e.start)+e.text+s.slice(e.end);
 parser.parse(s,{sourceType:'module',plugins:['jsx']});fs.writeFileSync(file,s);
 fs.appendFileSync('client/src/features/employment/employment.css',`\n/* Reputation is a section of the existing identity card, not a separate card. */
.rp-header .rp-reputation-inline{width:100%;box-sizing:border-box;border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important;margin:14px 0 0!important;padding:13px 0 0!important;background:transparent!important;box-shadow:none!important}
.rp-reputation-inline h3{margin:0 0 6px;font-size:14px;font-weight:750}
.rp-rep-stars{display:inline-flex;align-items:center;gap:3px;vertical-align:middle;flex-shrink:0}
.rp-rep-star{display:block;position:relative;width:21px;height:21px;flex:none;line-height:0}
.rp-rep-star>span{display:block;position:absolute;top:0;left:0;overflow:hidden;height:21px}
.rp-rep-star svg{max-width:none;display:block;flex:none}
@media(max-width:360px){.rp-rep-stars{gap:2px}.rp-rep-star{transform:scale(.9);transform-origin:left center;width:19px}}
`);
 const smoke='scripts/smoke-browser.cjs';let t=fs.readFileSync(smoke,'utf8');
 const anchor="console.log('BROWSER STARTUP PASSED');";
 if(t.split(anchor).length!==2)throw Error('Smoke anchor missing');
 // Close the contract overlay and verify placement through the existing profile navigation.
 t=t.replace(anchor,`const back=w.document.querySelector('.ov .hd button');if(back)await click(back);
const profileNav=w.document.querySelector('.mn-nav [aria-label="Mi perfil"],nav [aria-label="Mi perfil"]')||buttons().find(b=>b.getAttribute('title')==='Mi perfil'||b.getAttribute('aria-label')==='Mi perfil');
if(!profileNav)throw Error('Profile navigation missing');await click(profileNav);
const header=w.document.querySelector('.rp-header'),rep=header?.querySelector('.rp-reputation-inline');
if(!rep||rep.querySelectorAll('.rp-rep-star').length!==5)throw Error('Integrated reputation missing');
if(w.document.querySelectorAll('.rp-reputation-inline').length!==1)throw Error('Duplicated reputation');
console.log('BROWSER INTEGRATED PROFILE REPUTATION PASSED');
`+anchor);fs.writeFileSync(smoke,t);
 console.log('BETA: preserved original reputation card data, integrated inside identity card with five fractional gold stars; verification placement preserved.');
})();