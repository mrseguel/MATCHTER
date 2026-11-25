(function(){
const fs=require('node:fs'),f='client/src/App.jsx';let s=fs.readFileSync(f,'utf8');
const start=s.indexOf("   ${tab==='perfil'&&html");if(start<0)throw Error('Profile tab missing');
const end=s.indexOf("\n   ${tab==='seguridad'",start);if(end<0)throw Error('Profile end missing');
s=s.slice(0,start)+"   ${tab==='perfil'&&html`<${RoleProfileHome} person=${withAvatar({...ownProfile,avatar:demoPortrait(ownProfile)})} role=${role} editPhoto=${editPhoto} goTab=${goTab} onFavorites=${()=>setView({t:'favorites'})} onEmployment=${initial=>setView({t:'employment',initial})} onDemo=${()=>setView({t:'demo-profile'})} onRoleChange=${r=>{changeRole(r);setTab('perfil')}} onAdmin=${()=>setRole('admin')} savedCount=${saved.length} requestCount=${currentRequests.filter(r=>r.status==='pending').length} employment=${employment} projects=${projects} jobCount=${uiJobs.length}/>`}"+s.slice(end);
const anchor='  const [account, setAccount] = useState(null)';if(s.split(anchor).length!==2)throw Error('Account state anchor missing');
s=s.replace(anchor,anchor+'\n  const [employment,setEmployment]=useState(seedEmployment)');
const overlay="${view?.t === 'demo-profile'";const i=s.indexOf(overlay);if(i<0)throw Error('Demo overlay missing');
s=s.slice(0,i)+"${view?.t==='employment'&&html`<${Overlay} title='MATCHTER Empleos' onBack=${()=>setView(null)}><${EmploymentHub} key=${String(ownProfile?.id)+':'+view.initial} role=${role} person=${ownProfile} people=${pros} state=${employment} setState=${setEmployment} initial=${view.initial}/><//>`}\n"+s.slice(i);
s='import {RoleProfileHome} from "./features/employment/RoleProfileHome.jsx";\nimport {EmploymentHub} from "./features/employment/EmploymentHub.jsx";\nimport {seedEmployment} from "./features/employment/model.js";\n'+s;fs.writeFileSync(f,s);console.log('BETA: role-specific profile and employment preview integrated.');
})();