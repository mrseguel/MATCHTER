(function(){
 const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)},update=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
 update('client/src/App.jsx',s=>{
 const a='<${RoleProfileHome} verification=${html`<${ProfileVerificationBadge} verified=${!!ownProfile?.ver||!!demoVerified[String(ownProfile?.id)]} onVerify=${()=>setView({t:\'verify-profile\'})}/>`}';
 return once(s,a,'<${RoleProfileHome} verified=${!!ownProfile?.ver||!!demoVerified[String(ownProfile?.id)]} verification=${html`<${ProfileVerificationBadge} verified=${false} onVerify=${()=>setView({t:\'verify-profile\'})}/>`}');
 });
 update('client/src/features/employment/RoleProfileHome.jsx',s=>{
 s=once(s,'RoleProfileHome({verification,','RoleProfileHome({verification,verified,');
 s='import {BadgeCheck} from "lucide-react";\n'+s;
 const start=s.indexOf('<div className="card rp-header"');
 const stop=s.indexOf('{verification}',start);
 if(start<0||stop<0)throw Error('Profile header missing');
 const part=s.slice(start,stop);
 console.log('PROFILE HEADER BEFORE: '+part.slice(0,2700));
 // Use the existing header's balanced div boundaries instead of moving data cards.
 let depth=0,end=-1;
 for(const m of part.matchAll(/<div\b[^>]*>|<\/div>/g)){if(m[0]==='</div>'){depth--;if(depth===0){end=m.index+6;break}}else depth++}
 if(end<0)throw Error('Profile header closing div not found');
 let header=part.slice(0,end);
 // Match the displayed person's name inside the header, not personal-data fields.
 const name=header.match(/\{person\?\.name(?:\s*\|\|\s*['"][^'"]*['"])?\}/);
 if(!name)throw Error('Profile name missing: '+header);
 header=header.replace(name[0],'<span className="rp-name-verified">'+name[0]+'{verified&&<BadgeCheck aria-label="Perfil verificado de prueba" size={19} fill="#2684ff" color="white"/>}</span>');
 s=s.slice(0,start)+header+'{!verified&&verification}'+part.slice(end)+s.slice(stop+'{verification}'.length);
 return s;
 });
 fs.appendFileSync('client/src/features/discover/projectDeck.css','\n.rp-name-verified{display:inline-flex;align-items:center;gap:5px;max-width:100%;vertical-align:middle;flex-wrap:wrap}.rp-name-verified>svg{flex:none}.rp>.pd-verification{margin:0 0 10px;width:100%;box-sizing:border-box}\n');
 console.log('BETA: verification prompt immediately after profile header; verified profiles show only blue check beside their name.');
})();