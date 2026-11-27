(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)};
const vf='client/src/approved/visual.js';let s=fs.readFileSync(vf,'utf8');
s='import {ContractDocument,ContractSigning} from "../features/contracts/ContractFormal.jsx";\nimport {canPay,label as contractLabel,bothSigned} from "../features/contracts/model.js";\n'+s;
const start=s.indexOf('function Contract({'),end=s.indexOf('function NotaryFlow(',start);if(start<0||end<0)throw Error('Contract missing');
let c=s.slice(start,end);
c=once(c,'openDispute})','openDispute,actor,client,provider,onContinue})');
const detailStart=c.indexOf('<div className="card"><b style=${{fontSize:18}}>Detalle y Alcance'),detailEnd=c.indexOf('<div className="card"><b style=${{fontSize:18}}>Etapas e Hitos',detailStart);if(detailStart<0||detailEnd<0)throw Error('Detail missing');
c=c.slice(0,detailStart)+'<${ContractDocument} job=${j} client=${client} provider=${provider} stages=${stages}/>\n  '+c.slice(detailEnd);
const legalStart=c.indexOf('<div className="card" style=${{border:\'2px solid transparent\''),legalEnd=c.indexOf('<button className="btn out" onClick=${()=>openDispute(j)}>',legalStart);if(legalStart<0||legalEnd<0)throw Error('Legal card missing');
c=c.slice(0,legalStart)+'<${ContractSigning} job=${j} actor=${actor} client=${client} provider=${provider} stages=${stages} onChange=${next=>setJobs(js=>js.map(x=>x.id===j.id?{...x,...next}:x))} onContinue=${onContinue||onBack} onPay=${()=>setView({t:"wallet",id:j.pid})}/>\n  '+c.slice(legalEnd);
c=once(c,'Matched: ${p.name} (Contratista) & Cliente','Partes: ${client?.name||"Cliente"} y ${provider?.name||"Contratista"}');
s=s.slice(0,start)+c+s.slice(end);
s=once(s,"const d=1+(j.idOk?1:0)+(j.signed?1:0)+(j.notarized?1:0);const t=j.notarized?['Certificado demo','g']:j.signed?['Firmado','b']:['Por firmar',''];","const d=(j.formal?.signatures?.client?1:0)+(j.formal?.signatures?.provider?1:0);const t=[contractLabel(j),canPay(j)?'g':''];");
s=once(s,"(d/4*100)+'%'","(d/2*100)+'%'");s=once(s,'${d}/4 pasos de firma','${d}/2 firmas');
s=once(s,"${!j.notarized&&html\`<button className=\"btn sm out\" onClick=\${()=>setView({t:'notary',id:j.pid})}>Firmar contrato</button>\`}","${!canPay(j)&&html\`<button className=\"btn sm out\" onClick=\${()=>setView({t:'contract',id:j.pid})}>Firmar contrato</button>\`}");
s=once(s,'locked=${!!j&&!j.notarized}','locked=${!!j&&!canPay(j)}');s=once(s,'${s&&p&&locked&&html`<button type="button" className="mw-primary" onClick=${onContract}>Ver contrato</button>`}', '${s&&p&&locked&&html`<p className="mw-muted">Primero completa ambas firmas y, si elegiste notaría, su autorización para habilitar el pago de prueba.</p><button type="button" className="mw-primary" onClick=${onContract}>Ver contrato</button>`}');
fs.writeFileSync(vf,s);
const app='client/src/App.jsx';let a=fs.readFileSync(app,'utf8');a='import {canPay as contractCanPay} from "./features/contracts/model.js";\n'+a;
a=once(a,'<${Contract} j=${j} p=${vp}','<${Contract} j=${j} p=${vp} actor=${ownProfile} client=${profileById(j.clientId)||{name:"Cliente por individualizar"}} provider=${profileById(j.providerId)||{name:"Contratista por individualizar"}} onContinue=${()=>goTab("contratos")}');
a=once(a,'if (!job.notarized || job.paid >= 3)','if (!contractCanPay(job) || job.paid >= 3)');a=once(a,'El contrato de demostración debe estar certificado y tener un hito pendiente','El contrato de prueba debe estar firmado por ambas partes y completar la modalidad elegida');
a=once(a,"j.paid<3&&j.notarized","j.paid<3&&contractCanPay(j)");
// Legacy notary routes may not bypass bilateral signature: redirect their view to the same contract.
const ns=a.indexOf("${view&&view.t==='notary'"),ne=a.indexOf("\n",ns);if(ns<0||ne<0)throw Error('Legacy notary route missing');a=a.slice(0,ns)+a.slice(ns,ne).replace(/<\$\{NotaryFlow\}[\s\S]*?\/>/,'<${Contract} j=${j} p=${vp} actor=${ownProfile} client=${profileById(j.clientId)} provider=${profileById(j.providerId)} onBack=${()=>setView(null)} setJobs=${setJobs} setView=${setView} openDispute=${openDispute}/>')+a.slice(ne);
fs.writeFileSync(app,a);
console.log('BETA: contract clauses, PDF and print, independent bilateral signatures, choice simple/notary/no written contract, consistent payment gate.');
})();