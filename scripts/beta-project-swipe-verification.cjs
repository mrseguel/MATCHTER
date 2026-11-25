(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
update('client/src/components/Projects.jsx',s=>{
s=once(s,'const submit = event => {','const submit = async event => {');s=once(s,"const data = new FormData(event.currentTarget)","const form=event.currentTarget;const data = new FormData(form);const photos=Array.from(form.elements.photos?.files||[]);if(photos.length>5||photos.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024)){setError('Hasta 5 fotos JPG, PNG o WEBP de 5 MB cada una.');return}setError('')");
s=once(s,"const [showForm, setShowForm] = useState(false)","const [showForm, setShowForm] = useState(false)\n  const [error,setError]=useState('')");
s=once(s,'    onCreate({','    const ok=await onCreate({');s=once(s,"budget: Number(data.get('budget')),","budget: data.get('budget')===''?null:Number(data.get('budget')),");
s=once(s,"    })\n    event.currentTarget.reset()\n    setShowForm(false)","    },photos)\n    if(ok){form.reset();setShowForm(false)}");
s=once(s,'Presupuesto CLP<input name="budget" type="number" min="1" required','Presupuesto CLP (opcional)<input name="budget" type="number" min="1"');
s=once(s,'<button className="btn">Publicar en proyectos públicos</button>','<label>Fotos del proyecto (opcionales)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple/><small>Hasta 5 fotos. Sin fotos, se mostrará una imagen referencial.</small></label>${error&&html`<p role="alert" style=${{color:"#d33"}}>${error}</p>`}<button className="btn">Publicar en proyectos públicos</button>');
s=once(s,"project.ownerId === 'demo-client'","String(project.ownerId)===String(clientId)");s=s.replaceAll('${CLP(project.budget)}','${project.budget?CLP(project.budget):"Presupuesto por definir"}');return s;
});
update('server/src/app.js',s=>{
s=once(s,'!Number.isFinite(Number(budget)) || Number(budget) < 1','(budget!=null&&budget!==""&&(!Number.isFinite(Number(budget))||Number(budget)<1))');
s=once(s,'Título, descripción, especialidad, ubicación, presupuesto y ownerId son obligatorios','Título, descripción, especialidad, ubicación y ownerId son obligatorios; presupuesto opcional válido');
s=once(s,'budget: Number(budget), ownerId','budget: budget==null||budget===""?null:Number(budget), ownerId');return s;
});
update('client/src/App.jsx',s=>{
s='import {ProjectDeck} from "./features/discover/ProjectDeck.jsx";\nimport {ProfileVerification,ProfileVerificationBadge} from "./features/discover/ProfileVerification.jsx";\n'+s;
s=once(s,'const [seen, setSeen] = useState([])','const [seen, setSeen] = useState([])\n  const [savedProjects,setSavedProjects]=useState({})\n  const [demoVerified,setDemoVerified]=useState({})');
s=once(s,'const createPublicProject = async projectData => {','const createPublicProject = async (projectData,photos=[]) => {');
s=s.replace(/^\s*photo: 'https:\/\/images\.unsplash\.com\/photo-1556912172-[^']+',\n/m,'\n');
s=once(s,'[confirmedProject, ...previous]','[{...confirmedProject,photos:photos.map(file=>{const url=URL.createObjectURL(file);mediaUrls.current.add(url);return url})}, ...previous]');
s=once(s,'const ownProfile=role===\'Cliente\'?activeClient:roleProfile','const ownProfile=role===\'Cliente\'?activeClient:roleProfile');
s=once(s,'const SUB={employment:',"const projectExplore=tab==='proyectos'&&role!=='Cliente';\n const SUB={employment:");
s=once(s,'(tab==="explorar"?" discover-centered-header":"")','(tab==="explorar"||projectExplore?" discover-centered-header":"")');
s=once(s,'${tab==="explorar"?html`<button className=${"chip mn-filter"','${(tab==="explorar"||projectExplore)?html`<button className=${"chip mn-filter"');
s=once(s,"tab==='explorar'?null:html`<span style=${{width:44}}></span>`","(tab==='explorar'||projectExplore)?null:html`<span style=${{width:44}}></span>`");
s=once(s,"(tab==='explorar'?' fit':'')","(tab==='explorar'||projectExplore?' fit':'')");
s=once(s,"${tab === 'proyectos' && html`<${Projects}","${tab === 'proyectos' && role==='Cliente' && html`<${Projects}");
const anchor="${tab==='cotizador'&&html";
s=once(s,anchor,"${projectExplore&&html`<${ProjectDeck} key=${String(ownProfile?.id)} projects=${projects} people=${DEMO_CLIENTS.map(p=>({...p,avatar:demoPortrait(p),ver:p.ver||demoVerified[String(p.id)]}))} requests=${requests} providerId=${activeProviderId} onInterest=${expressInterest} onProfile=${p=>setView({t:'pro',id:p.ownerId})} filtersOpen=${filtersOpen} setFiltersOpen=${setFiltersOpen} saved=${savedProjects} setSaved=${setSavedProjects}/>`}\n   "+anchor);
s=once(s,"<${RoleProfileHome}","<${RoleProfileHome} verification=${html`<${ProfileVerificationBadge} verified=${!!ownProfile?.ver||!!demoVerified[String(ownProfile?.id)]} onVerify=${()=>setView({t:'verify-profile'})}/>`}");
const anchor2='${view?.t==="settings"';
s=once(s,anchor2,'${view?.t==="verify-profile"&&html`<${Overlay} title="Verificar mi perfil" onBack=${()=>setView(null)}><${ProfileVerification} person=${ownProfile} onConfirm=${()=>{setDemoVerified(v=>({...v,[String(ownProfile.id)]:true}));if(role!=="Cliente")setPros(ps=>ps.map(p=>String(p.id)===String(ownProfile.id)?{...p,ver:true}:p));setView(null);goTab("perfil");toast("Verificación de prueba completada")}}/><//>`}\n'+anchor2);
return s;
});
update('client/src/features/employment/RoleProfileHome.jsx',s=>{
const sig=s.match(/export function RoleProfileHome\(\{[^}]*\}\)/);if(!sig)throw Error('RoleProfileHome signature missing');s=s.replace(sig[0],sig[0].replace('({','({verification,'));
const i=s.indexOf('className="card rp-claims-priority"');if(i<0)throw Error('Profile claims placement missing');const at=s.lastIndexOf('<div',i);s=s.slice(0,at)+'{verification}'+s.slice(at);return s;
});
console.log('BETA: swipe project deck for all provider roles, optional budget/photos, saved projects and own profile verification badge.');
})();