(function(){
 const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,150));return s.replace(a,b)};
 update('client/src/App.jsx',s=>{
 s='import {Claims} from "./features/claims/Claims.jsx";\nimport {createClaim} from "./features/claims/model.js";\n'+s;
 const seedStart=s.indexOf('const [disputes, setDisputes] = useState(['),seedEnd=s.indexOf('])',seedStart);
 if(seedStart<0||seedEnd<0)throw Error('Old disputes state missing');
 s=s.slice(0,seedStart)+`const [disputes, setDisputes] = useState(()=>[createClaim({id:'1024',actor:DEMO_CLIENT,target:{id:1,name:'Carlos Muñoz'},job:DEMO_JOBS[0],description:'Ejemplo: las terminaciones de la ampliación no coinciden con lo acordado. Solicito revisar los trabajos pendientes con la contraparte.',reason:'Calidad o defectos de la obra',requested:'Revisar las terminaciones y acordar un plazo para subsanarlas.',evidence:[{id:'demo-evidence-1',name:'Foto_obra_demo.jpg'}],now:'2026-11-23T18:00:00-03:00'})])\n  const [claimJob,setClaimJob]=useState(null)`+s.slice(seedEnd+2);
 const start=s.indexOf('const openDispute = job => {'),end=s.indexOf('\n  if (!account)',start);
 if(start<0||end<0)throw Error('Contract dispute action missing');
 s=s.slice(0,start)+`const openDispute = job => {
    setClaimJob(job)
    setView(null)
    setTab('seguridad')
  }
`+s.slice(end);
 s=once(s,"${tab==='seguridad'&&html`<${Security} disputes=${disputes} setDisputes=${setDisputes} toast=${toast}/>`}","${tab==='seguridad'&&html`<${Claims} key=${String(ownProfile?.id)+':'+String(claimJob?.id||'')} actor=${ownProfile} people=${[...pros,...DEMO_CLIENTS]} jobs=${uiJobs} disputes=${disputes} setDisputes=${setDisputes} initialJob=${claimJob&&uiJobs.find(j=>j.id===claimJob.id)} onClearInitial=${()=>setClaimJob(null)}/>`}");
 s=once(s,'const goTab=k=>{setView(null);','const goTab=k=>{setClaimJob(null);setView(null);');
 s=once(s,'applications:employment.applications,social:socialActivity','applications:employment.applications,social:socialActivity,claims:disputes');
 return s;
 });
 update('client/src/components/Admin.jsx',s=>{
 s='import {ClaimsAdmin} from "../features/claims/Claims.jsx";\n'+s;
 const start=s.indexOf("\${tab==='rec'&&html`"),end=s.indexOf("\n   \${tab==='pag'",start);if(start<0||end<0)throw Error('Admin claims section missing');
 return s.slice(0,start)+"\${tab==='rec'&&html`<\${ClaimsAdmin} disputes=\${disputes} setDisputes=\${setDisputes}/>`}"+s.slice(end);
 });
 update('client/src/features/notifications/model.js',s=>{
 s=once(s,'applications=[],social={},system=[]','applications=[],social={},system=[],claims=[]');
 s=once(s,'return [...system.filter(n=>same(n.recipientId,me)),...out].reverse();',`for(const c of claims){if(!same(c.complainantId,me)&&!same(c.respondentId,me))continue;for(const [i,h] of (c.history||[]).entries()){if(!same(h.by,me))add('claim:'+c.id+':'+i,'Reclamos',h.label,c.title,'seguridad');}}
 return [...system.filter(n=>same(n.recipientId,me)),...out].reverse();`);
 return s;
 });
 console.log('BETA: bilateral claims, real session evidence attachments, automatic progress, documented response, mediator admin workflow, dual acceptance, case history and scoped notifications.');
})();