(function(){
 const fs=require('node:fs'),p='client/src/features/employment/RoleProfileHome.jsx';let s=fs.readFileSync(p,'utf8');
 const start=s.indexOf('<div className="rp-account rp-reputation-inline">');
 if(start<0)throw Error('Integrated reputation not found');
 const end=s.indexOf('· datos de prueba.</p></div>',start);
 if(end<0)throw Error('Reputation end missing');
 const old=s.slice(start,end+'· datos de prueba.</p></div>'.length);
 const starsStart=old.indexOf('<div className="rp-rep-stars"'),starsEnd=old.indexOf('</div>',starsStart);
 if(starsStart<0||starsEnd<0)throw Error('Stars missing');
 const stars=old.slice(starsStart,starsEnd+6);
 const next='<div className="rp-reputation-inline"><div className="rp-rep-heading"><b>Reputación</b><span>{Number.isFinite(person?.n)?person.n+" evaluaciones":"Sin evaluaciones registradas"}</span></div><div className="rp-rep-rating"><div className="rp-rep-score">{Number.isFinite(person?.r)?<><strong>{person.r.toFixed(1).replace(".",",")}</strong><span> / 5</span></>:<b>Sin evaluaciones</b>}</div>'+stars+'</div><p className="mut">{client?"Evaluaciones como cliente":"Evaluaciones de servicios prestados"} · datos de prueba.</p></div>';
 s=s.replace(old,next);fs.writeFileSync(p,s);require('@babel/parser').parse(s,{sourceType:'module',plugins:['jsx']});
 fs.appendFileSync('client/src/features/employment/employment.css',`\n.rp-reputation-inline{display:grid;gap:8px}.rp-rep-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}.rp-rep-heading>b{font-size:13px;font-weight:750}.rp-rep-heading>span{color:var(--mut);font-size:11px}.rp-rep-rating{display:flex;align-items:center;justify-content:space-between;gap:10px}.rp-rep-score{display:flex;align-items:baseline;gap:3px;white-space:nowrap}.rp-rep-score>strong{font-size:30px;font-weight:800;line-height:1;letter-spacing:-.8px;font-variant-numeric:tabular-nums}.rp-rep-score>span{font-size:13px;color:var(--mut)}.rp-reputation-inline>p{font-size:11px;margin:0;line-height:1.4}.rp-rep-stars{padding:7px 9px;border-radius:10px;background:#f5b83d12}.rp-rep-rating .rp-rep-stars{gap:5px}\n`);
 console.log('BETA: reputation summary integrated as a distinct compact section of the header; average, fractional stars and existing review count.');
})();