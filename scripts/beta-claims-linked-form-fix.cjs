(function(){
 const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,150));return s.replace(a,b)};
 update('client/src/features/claims/Claims.jsx',s=>{
 s=once(s,'createClaim({id:uid(),actor,target,job,...form,evidence,now:iso()})','createClaim({...form,id:uid(),actor,target,job,evidence,now:iso()})');
 s=once(s,"{c.status==='resolved'&&<div className=\"cl-success\">","{!!c.previousProposals?.length&&<details><summary>Ver propuestas anteriores</summary>{c.previousProposals.map(p=><div className=\"cl-message\" key={p.version}><b>Versión {p.version}</b><p className=\"cl-description\">{p.text}</p><small>{fmt(p.at)} · {Object.values(p.decisions).includes('reject')?'No aceptada':'Sustituida'}</small></div>)}</details>}{c.status==='resolved'&&<div className=\"cl-success\">");
 return s;
 });
 update('client/src/features/claims/model.js',s=>once(s,'next.proposal={text:clean(action.text),version:',"next.previousProposals=[...(c.previousProposals||[]),...(c.proposal?[c.proposal]:[])];next.proposal={text:clean(action.text),version:"));
 console.log('BETA: verified linked-project form uses job object and previous proposals stay in the case record.');
})();