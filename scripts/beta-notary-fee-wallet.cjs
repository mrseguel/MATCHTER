(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,160));return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
update('client/src/features/contracts/model.js',s=>{
s=once(s,"export const bothSigned=",`export const NOTARY_FEE_PER_PARTY=16745;
export const NOTARY_TOTAL=33490;
export const bothNotaryFeesPaid=job=>job.formal?.mode==='notary'&&['client','provider'].every(side=>job.formal?.fees?.[side]?.amount===NOTARY_FEE_PER_PARTY);
export function payNotaryFee(job,actor,card,at){
 const side=party(job,actor);
 if(!side||job.formal?.mode!=='notary'||!job.formal.signatures?.[side]||job.formal.fees?.[side]||!card?.l||!at)throw Error('Para pagar debes haber firmado tu parte del contrato notarial; no se permite duplicar el pago.');
 return {...job,formal:{...job.formal,fees:{...job.formal.fees,[side]:{amount:NOTARY_FEE_PER_PARTY,at,last4:String(card.l).slice(-4),method:card.b,demo:true}}}};
}
export const bothSigned=`);
s=once(s,"job.formal.mode==='notary'&&job.formal.notary===true","job.formal.mode==='notary'&&bothNotaryFeesPaid(job)&&job.formal.notary===true");
s=once(s,"terms,signatures:{},notary:false","terms,signatures:{},fees:{},notary:false");
s=once(s,"||!bothSigned(job)||job.formal.notary)","||!bothSigned(job)||!bothNotaryFeesPaid(job)||job.formal.notary)");
s=once(s,"Se requieren las dos firmas y modalidad notarial.","Se requieren las dos firmas, los dos pagos y modalidad notarial.");
return s;
});
update('client/src/features/contracts/ContractFormal.jsx',s=>{
s=once(s,"party,choose,sign,authorize,canPay,label,documentTerms","party,choose,sign,authorize,canPay,label,documentTerms,NOTARY_FEE_PER_PARTY,NOTARY_TOTAL,bothNotaryFeesPaid");
s=once(s,"onChange,onContinue,onPay})","onChange,onContinue,onPay,onNotaryPay})");
s=once(s,"Firma de ambas partes y autorización notarial posterior.","Firma de ambas partes y autorización notarial posterior. Tarifa referencial de ejemplo.");
s=once(s,"<b>{title}</b><small>{desc}</small>","<b>{title}</b><small>{desc}</small><span className={'tag '+(mode==='simple'?'g':'')}>{mode==='simple'?'Sin costo':'$16.745 CLP por persona'}</span>");
s=once(s,"{['simple','notary'].includes(f?.mode)&&<>","{['simple','notary'].includes(f?.mode)&&<>{f.mode==='simple'?<span className=\"tag g\">Sin costo · $0 CLP</span>:<div className=\"ct-fee-summary\"><b>Valor referencial del trámite notarial</b><div className=\"row sp\"><span>Total ambas partes</span><b>$33.490 CLP</b></div><div className=\"row sp\"><span>Cliente</span><b>$16.745 CLP</b></div><div className=\"row sp\"><span>Contratista o empresa</span><b>$16.745 CLP</b></div><p className=\"mut\">Tarifa ilustrativa de autorización notarial; no es una cotización definitiva. Cada parte paga desde Wallet después de registrar su firma de prueba.</p></div>}");
s=once(s,"<h4>Verificación de identidad y firma de prueba</h4>","<h4>Verificación de identidad y firma de prueba</h4>{f.mode==='notary'&&<div className=\"ct-fee-summary\"><b>Identidad para autorización notarial</b><p className=\"mut\">En producción la identificación se realiza en el servicio oficial o proveedor habilitado. ClaveÚnica solo cuando corresponda; MATCHTER nunca pide su contraseña. Aquí se simula mediante cédula ficticia.</p></div>}");
s=once(s,"{f.signatures.client&&f.signatures.provider&&f.mode==='notary'&&!f.notary&&<><p className=\"mut\">Ambas firmas registradas. Falta la autorización notarial. No existe conexión con una notaría real.</p><button className=\"btn\" onClick={()=>act(()=>authorize(job,actor.id,new Date().toISOString()))}>Simular autorización notarial</button></>}","{f.mode==='notary'&&<div className=\"ct-fee-summary\"><h4>Pago del trámite notarial</h4>{[['client',terms.client],['provider',terms.provider]].map(([k,n])=><div key={k} className=\"ct-status\"><span>{n}</span><b>{f.fees?.[k]?'Pagado · demo':'$16.745 pendientes'}</b></div>)}{side&&f.signatures[side]&&!f.fees?.[side]&&<button className=\"btn\" onClick={onNotaryPay}>Pagar mi parte · $16.745 CLP</button>}{side&&f.fees?.[side]&&<span className=\"tag g\">Tu pago de prueba está registrado</span>}<p className=\"mut\">La autorización solo se solicita cuando las dos partes han firmado y pagado. El pago no equivale a una certificación.</p></div>}{f.signatures.client&&f.signatures.provider&&bothNotaryFeesPaid(job)&&!f.notary&&<><p className=\"mut\">Ambas firmas y pagos de prueba registrados. Falta la intervención notarial real.</p><button className=\"btn\" onClick={()=>act(()=>authorize(job,actor.id,new Date().toISOString()))}>Simular autorización notarial</button></>}");
return s;
});
update('client/src/features/contracts/contracts.css',s=>s+"\n.ct-fee-summary{display:grid;gap:8px;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:12px;font-size:13px}.ct-option .tag{display:inline-block;margin-top:7px}.ct-fee-wallet{display:grid;gap:10px}");
update('client/src/approved/visual.js',s=>once(s,'onPay=${()=>setView({t:"wallet",id:j.pid})}/>', 'onPay=${()=>setView({t:"wallet",id:j.pid})} onNotaryPay=${()=>setView({t:"notary-fee",id:j.pid})}/>'));
update('client/src/App.jsx',s=>{
s='import {NotaryFeeWallet} from "./features/contracts/NotaryFeeWallet.jsx";\nimport {payNotaryFee} from "./features/contracts/model.js";\n'+s;
const marker="${view&&view.t==='wallet'&&j&&vp&&j.paid<3&&contractCanPay(j)";
s=once(s,marker, '${view?.t==="notary-fee"&&j&&html`<${Overlay} title="WALLET" onBack=${()=>setView({t:"contract",id:j.id})}><${NotaryFeeWallet} job=${j} actor=${ownProfile} cards=${cards} addCard=${addCard} onBack=${()=>setView({t:"contract",id:j.id})} onPay=${card=>{const next=payNotaryFee(j,ownProfile.id,card,new Date().toISOString());setJobs(js=>js.map(x=>x.id===j.id?{...x,...next}:x));toast("Pago notarial de prueba registrado");}}/><//>`}\n  '+marker);
return s;
});
update('client/src/features/contracts/model.test.js',s=>{
s=once(s,'choose,sign,authorize,canPay,bothSigned,documentTerms','choose,sign,authorize,canPay,bothSigned,documentTerms,payNotaryFee,bothNotaryFeesPaid');
s=once(s,"j=authorize(j,'c','now');assert.ok(canPay(j));","assert.throws(()=>authorize(j,'c','now'));j=payNotaryFee(j,'c',{l:'4321',b:'VISA'},'now');assert.throws(()=>payNotaryFee(j,'c',{l:'4321'},'now'));assert.equal(bothNotaryFeesPaid(j),false);assert.throws(()=>authorize(j,'c','now'));j=payNotaryFee(j,1,{l:'8765',b:'Mastercard'},'now');assert.ok(bothNotaryFeesPaid(j));j=authorize(j,'c','now');assert.ok(canPay(j));");return s;
});
update('scripts/smoke-browser.cjs',s=>once(s,"await click(find(/^Firmar contrato simple/));","if(!find(/Firmar contrato simple[\\s\\S]*Sin costo/))throw Error('Free simple label missing');if(!find(/Firmar y autorizar ante notario[\\s\\S]*16\\.745/))throw Error('Notary price missing');await click(find(/^Firmar y autorizar ante notario/));if(!rootEl.textContent.includes('$33.490 CLP'))throw Error('Notary fee details missing');await click(find(/^Firmar contrato simple/));"));
console.log('BETA: free simple contract label; individual demo notary fees via Wallet; authorization gated by both signatures and both payments; no real charge.');
})();