(function(){
 const fs=require('node:fs'),file='client/src/features/auth/AuthPreview.jsx';
 let s=fs.readFileSync(file,'utf8');
 const old="try{const user=step==='register'?await registerTest({...form,type}):await loginTest(form.email,form.password);";
 const next="try{if(step==='login'&&!form.email.trim()&&!form.password){onEnter({mode:'Demo',type:'Perfil clientes'});return}const user=step==='register'?await registerTest({...form,type}):await loginTest(form.email,form.password);";
 function once(a,b){if(s.split(a).length!==2)throw Error('Unexpected login anchor: '+a.slice(0,80));s=s.replace(a,b)}
 once(old,next);
 once("{required:true,type:'email',autoCapitalize:'none',autoCorrect:'off',spellCheck:false,maxLength:254,placeholder:'cuenta@example.test'}","{required:step==='register'||Boolean(form.password),type:'email',autoCapitalize:'none',autoCorrect:'off',spellCheck:false,maxLength:254,placeholder:'cuenta@example.test'}");
 once("<input required type={show?'text':'password'} value={form.password}","<input required={step==='register'||Boolean(form.email.trim())} type={show?'text':'password'} value={form.password}");
 once("{error&&<p className=\"beta-auth-error\" role=\"alert\">{error}</p>}","{step==='login'&&<small className=\"mut\">Acceso temporal de prueba: puedes ingresar sin completar los campos.</small>}{error&&<p className=\"beta-auth-error\" role=\"alert\">{error}</p>}");
 fs.writeFileSync(file,s);
 console.log('BETA only: empty login enters fictional client profile; nonempty credentials still validated; registration unchanged.');
})();