(function(){
const fs=require('node:fs'),f='scripts/beta-cv-personal-documents.cjs';let s=fs.readFileSync(f,'utf8');
const a="showCV(p,c)}}}>Ver perfil laboral",b='setPreview({...makeCV(p,c,{jobs,portfolio}),rut:"",phone:"",email:""});setError("")}}}>Ver perfil laboral';
if(s.split(a).length!==2||s.split(b).length!==2)throw Error('Cannot locate patch anchor');
s=s.replace(a,'showCV(p,c)').replace(b,'setPreview({...makeCV(p,c,{jobs,portfolio}),rut:"",phone:"",email:""});setError("")');
fs.writeFileSync(f,s);
})();