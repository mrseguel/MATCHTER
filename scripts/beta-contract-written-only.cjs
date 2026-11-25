(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
update('client/src/features/contracts/model.js',s=>{s=once(s,"['simple','notary','none'].includes(mode)","['simple','notary'].includes(mode)");s=once(s,"job.formal?.mode==='none'?'Sin contrato escrito':","");return s});
update('client/src/features/contracts/ContractFormal.jsx',s=>{
s=once(s,",none:'Sin contrato escrito'","");
s=once(s,",['none','Continuar sin contrato escrito','Sin documento firmado ni habilitación de pago protegido en esta demo.']","");
s=once(s,"if(mode==='none'&&!window.confirm('¿Continuar sin un contrato escrito? No se habilitará el pago protegido.'))return;","");
s=once(s,"{f?.mode==='none'?<><p className=\"mut\">Modalidad seleccionada: sin contrato escrito. Puedes cambiarla antes de firmar. Esto no significa que no existan obligaciones derivadas del acuerdo.</p><button className=\"btn out\" onClick={onContinue}>Continuar</button></>:f?.mode&&<>","{['simple','notary'].includes(f?.mode)&&<>");
s=once(s,"Elige la modalidad. El contrato y sus firmas quedan asociados a ambas partes.","Elige una de las dos modalidades de contrato escrito. Ambas partes deben firmar el mismo documento.");
return s;
});
update('client/src/features/contracts/model.test.js',s=>once(s,"assert.equal(canPay(choose(job,'c','none',terms)),false);","assert.throws(()=>choose(job,'c','none',terms));assert.equal(canPay(job),false);"));
update('scripts/smoke-browser.cjs',s=>once(s,"await click(find(/^Firmar contrato simple/));","if(find(/Continuar sin contrato escrito/))throw Error('Unsigned option must not exist');if(!find(/^Firmar y autorizar ante notario/))throw Error('Notarial option missing');await click(find(/^Firmar contrato simple/));"));
console.log('BETA: only simple and notarial written contracts accepted; unsigned mode rejected by model and removed from UI; payment gate unchanged.');
})();