(function(){
 const fs=require('node:fs'),f='client/src/App.jsx';let s=fs.readFileSync(f,'utf8');
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b)};
 s='import {useAppearance,IconNavigation,SettingsGear,SettingsPanel} from "./features/settings/Appearance.jsx";\n'+s;
 once('  const [account, setAccount] = useState(null)','  const [account, setAccount] = useState(null)\n  const [appearance,setAppearance]=useAppearance()');
 const navStart=s.indexOf('  <div className=${"nav community-nav"+');
 if(navStart<0)throw Error('Nav not found');
 const navEnd=s.indexOf('\n',navStart);
 if(navEnd<0||!s.slice(navStart,navEnd).includes('MplayWelcome'))throw Error('Unexpected nav line');
 s=s.slice(0,navStart)+'  <${IconNavigation} tab=${tab} role=${role} goTab=${goTab} messageCount=${uiJobs.filter(item=>(chats[item.id]||[]).length).length}><${MplayWelcome} active=${tab==="videos"}/><//>'+s.slice(navEnd);
 once('${tab===\'wallet\'?html`<button className="chip"','<div className="mn-head-tools">${tab===\'wallet\'?html`<button className="chip"');
 once('<span style=${{width:44}}></span>`}</div>`}','<span style=${{width:44}}></span>`}<${SettingsGear} onClick=${()=>setView({t:"settings"})}/></div></div>`}');
 const cStart=s.indexOf('<${Community} active=${tab===\'videos\'}');
 if(cStart<0)throw Error('Community mount missing');
 s=s.slice(0,cStart)+s.slice(cStart).replace('<${Community} active=','<${Community} onSettings=${()=>setView({t:"settings"})} active=');
 once('${view?.t===\'employment\'', '${view?.t==="settings"&&html`<${Overlay} title="Ajustes" onBack=${()=>setView(null)}><${SettingsPanel} mode=${appearance} setMode=${setAppearance} onProfile=${()=>goTab("perfil")} onLogout=${()=>{setAccount(null);setView(null);setMatch(null);setRequestDraft(null)}}/><//>`}\n${view?.t===\'employment\'');
 fs.writeFileSync(f,s);
 const cf='client/src/features/community/Community.jsx';let c=fs.readFileSync(cf,'utf8');
 const sig='export function Community({';if(c.split(sig).length!==2)throw Error('Community signature missing');
 c='import {SettingsGear} from "../settings/Appearance.jsx";\n'+c.replace(sig,sig+'onSettings,');
 const old='<div className="cm-brand logo" aria-label="Match Play">MATCHPLAY</div><span aria-hidden="true"></span>';
 if(c.split(old).length!==2)throw Error('Community top gear anchor missing');
 c=c.replace(old,'<div className="cm-brand logo" aria-label="Match Play">MATCHPLAY</div><${SettingsGear} video=${true} onClick=${onSettings}/>');
 fs.writeFileSync(cf,c);
 // Retain the existing welcome tooltip without depending on the old menu grid.
 const css='client/src/features/settings/appearance.css';
 // Convert fixed neutral colors in UI styles to dark-only overrides. Keep colored badges, videos, photographs and signature canvas unchanged.
 const postcss=require('postcss'),out=[];
 const white=new Set(['#fff','#ffffff','white','#f6f7f9','#f5f7fa','#f0f2f5','#f1f3f6','#f7f9fb','#f8fafc','#f3f4f6','#f0f3f6','#f9fafb','#f5f6f8']);
 const dark=new Set(['#162333','#18283a','#17283a','#0b1f5c','#111827','#1e293b','#0f172a','#334155','#18283a']);
 const gray=new Set(['#687587','#64748b','#66768a','#6b7788','#5b6785','#5b6676','#475569']);
 const border=new Set(['#e1e6eb','#e3e8f2','#e6e8ee','#dce1e7','#e4e8ed','#e2e8f0','#edf0f4','#e5e7eb','#e1e6eb','#dbe2ea']);
 for(const name of ['styles.css','features/quotes/quotes.css','features/portfolio/portfolio.css','features/portfolio/explore-profile-shell.css','features/employment/employment.css','features/auth/auth.css']){
 const ast=postcss.parse(fs.readFileSync('client/src/'+name,'utf8'));
 ast.walkRules(r=>{if(r.parent?.type!=='root'||/\.cm|\.mp-|\.matchplay|\.sig\b|\.mt\b|\.ph\b|\.cap\b|\.hero\b|\.ban\b|\.wc\b|\.wcard\b|\.tag\b|\.pill\b|\.ver\b|\.btn\.gr|\.btn\.dk|\.btn\.sm|\.emp-tag|\.emp-success|\.emp-error|\.rp-employment-intro|\.emp-hero|\.rp-avatar|\.rp-camera|\.b1\b|\.b2\b|\.badge\b|\.toast\b|\.ochip\b|\.cta\b|\.stamp\b|\.dot\b|\.opt span|\.trust|\.act\.big/.test(r.selector))return;
 const decl=[];r.walkDecls(d=>{const p=d.prop,v=d.value.trim().toLowerCase();if((p==='background'||p==='background-color')&&white.has(v))decl.push(p+':var(--card)!important');else if(p==='color'&&dark.has(v))decl.push(p+':var(--tx)!important');else if(p==='color'&&gray.has(v))decl.push(p+':var(--mut)!important');else if(p.startsWith('border')&&border.has(v))decl.push(p+':var(--line)!important');});
 if(decl.length){const sels=r.selectors.filter(x=>!x.includes(':root')&&!/^(html|body|\*)$/.test(x.trim()));if(sels.length)out.push(sels.map(x=>'[data-matchter-theme=dark] '+x).join(',')+'{'+decl.join(';')+'}')}
 });
 }
 fs.appendFileSync(css,'\n'+out.join('\n')+'\n');
 console.log('BETA: icon-only navigation, hover and long press labels, settings, persistent light/dark/system appearance.');
})();