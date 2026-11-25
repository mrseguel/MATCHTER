(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
update('client/src/features/employment/RoleProfileHome.jsx',s=>{
s=once(s,'RoleProfileHome({verification,verified,','RoleProfileHome({onReviews,verification,verified,');
s=once(s,'<div className="rp-reputation-inline"><div className="rp-rep-heading">','<div className="rp-reputation-inline"><button type="button" className="rp-reputation-hit" aria-label="Ver todas las calificaciones" onClick={onReviews}/><div className="rp-rep-heading">');
s=once(s,'person.n+" evaluaciones":"Sin evaluaciones registradas"}</span>','person.n+" evaluaciones":"Sin evaluaciones registradas"}<ChevronRight size={15}/></span>');return s});
update('client/src/App.jsx',s=>{
s='import {ReviewHistory} from "./features/reviews/ReviewHistory.jsx";\n'+s;
s=once(s,'<${RoleProfileHome} verified=','<${RoleProfileHome} onReviews=${()=>setView({t:"review-history"})} verified=');
s=once(s,'${view?.t==="verify-profile"','${view?.t==="review-history"&&html`<${Overlay} title="Calificaciones" onBack=${()=>setView(null)}><${ReviewHistory} key=${String(ownProfile?.id)} person=${ownProfile}/><//>`}\n${view?.t==="verify-profile"');return s});
update('scripts/smoke-browser.cjs',s=>once(s,"console.log('BROWSER INTEGRATED PROFILE REPUTATION PASSED');",`console.log('BROWSER INTEGRATED PROFILE REPUTATION PASSED');
await click(w.document.querySelector('.rp-reputation-hit'));if(w.document.querySelectorAll('.rv-review').length!==4)throw Error('Expected all 4 client sample evaluations');if(!w.document.querySelector('.rv-history')?.textContent.includes('evaluaciones de ejemplo'))throw Error('Demo label missing');
console.log('BROWSER REVIEW HISTORY PASSED');`));
console.log('BETA: integrated reputation opens full review history with matching illustrative count and rounded average, sort and rating filters.');
})();