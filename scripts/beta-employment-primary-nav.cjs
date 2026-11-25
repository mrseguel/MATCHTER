(function(){
 const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,130));return s.replace(a,b)};
 update('client/src/features/settings/Appearance.jsx',s=>{
 s=once(s,'Compass,FileText,Calculator,Play,Plus,MessageCircle','Compass,FileText,Calculator,Play,Plus,BriefcaseBusiness,MessageCircle');
 s=once(s,"['contratos',FileText,'Contratos']","['employment',BriefcaseBusiness,'MATCHTER Empleos']");
 s=once(s,"['seguridad',ShieldCheck,'Reclamos']","['contratos',FileText,'Contratos']");
 s=once(s,"['wallet','trabajos','solicitudes'].includes(tab)","['wallet','trabajos','solicitudes','seguridad'].includes(tab)");
 return s;
 });
 update('client/src/features/employment/RoleProfileHome.jsx',s=>{
 const matches=[...s.matchAll(/<Tile\b[^<>]*?title="Reclamos y mediación"[^<>]*?\/>/g)];
 if(matches.length!==1)throw Error('Expected exactly one existing Reclamos tile; found '+matches.length);
 const tile=matches[0][0];
 s=s.replace(tile,'');
 s=once(s,'<div className="card rp-stats">','<div className="card rp-claims-priority">'+tile+'</div><div className="card rp-stats">');
 console.log('BETA moved existing claims entry before profile statistics: '+tile);
 return s;
 });
 update('client/src/App.jsx',s=>{
 s='import {ClientEmployment} from "./features/employment/ClientEmployment.jsx";\n'+s;
 s=once(s,"const SUB={videos:","const SUB={employment:'MATCHTER Empleos',videos:");
 s=once(s,'["trabajos","wallet"].includes(tab)?html`','["trabajos","wallet","seguridad"].includes(tab)?html`');
 const anchor="${tab==='trabajos'&&html";
 s=once(s,anchor,"${tab==='employment'&&html`<${React.Fragment}>${role==='Cliente'?html`<${ClientEmployment} state=${employment} onProfile=${()=>goTab('perfil')}/>`:html`<${EmploymentHub} key=${String(ownProfile?.id)+':employment'} role=${role} person=${ownProfile} people=${pros} state=${employment} setState=${setEmployment} initial=${role==='Empresa'?'publish':'offers'} jobs=${jobs} portfolio=${portfolio}/>`}<//>`}\n   "+anchor);
 // Preserve access from notification rows, but route the claims category through the profile as requested.
 s=once(s,'goTab(n.tab)}}','goTab(n.tab==="seguridad"?"perfil":n.tab)}}');
 return s;
 });
 fs.appendFileSync('client/src/features/employment/employment.css',`
.rp-claims-priority{margin-top:0;padding:5px 7px;border:1px solid #ff5a0055;background:var(--card)}
.rp-claims-priority .rp-tile{width:100%;border:0;color:var(--tx);background:transparent}
.rp-claims-priority .rp-icon{background:var(--soft);color:#ff5a00}
.rp-claims-priority .rp-tile b{font-size:14px}
.client-employment-search,.client-employment-city{display:flex;align-items:center;gap:7px}
.client-employment-search input{min-width:0;flex:1}
`);
 console.log('BETA: employment direct access replaces claims in primary nav, contracts moved beside profile, existing role-specific hub reused; client gets read-only offer browsing, claims prominent beneath personal details.');
})();