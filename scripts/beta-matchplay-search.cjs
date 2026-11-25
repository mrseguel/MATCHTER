(function(){
const fs=require('node:fs'),f='client/src/features/community/Community.jsx';let s=fs.readFileSync(f,'utf8');const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b)};
s='import {MatchplaySearch} from "./MatchplaySearch.jsx";\nimport {Search as MatchplaySearchIcon} from "lucide-react";\n'+s;
once('const [panel,setPanel]=useState(null)','const [panel,setPanel]=useState(null)\n const [searchOpen,setSearchOpen]=useState(false)\n useEffect(()=>{setSearchOpen(false)},[me])');
once('<${SettingsGear} video=${true} onClick=${onSettings}/>','<div className="mp-search-tools"><button className="mp-search-trigger" aria-label="Buscar en MATCHPLAY" title="Buscar" onClick=${()=>{close();setSearchOpen(true)}}><${MatchplaySearchIcon} size=${25}/></button><${SettingsGear} video=${true} onClick=${onSettings}/></div>');
once('active=${active&&!panel}', 'active=${active&&!panel&&!searchOpen}');
once('<article className="cm-video" key=${p.id}>','<article className="cm-video" key=${p.id} data-matchplay-post=${p.id}>');
const anchor='  ${panel&&html';if(s.split(anchor).length!==2)throw Error('Panel anchor missing');
s=s.replace(anchor,`  \${searchOpen&&html\`<\${MatchplaySearch} people=\${people} posts=\${posts.filter(p=>!(hidden[me]||[]).includes(p.id))} onClose=\${()=>setSearchOpen(false)} onProfile=\${id=>{setSearchOpen(false);show({type:'author',author:identity(id)})}} onVideo=\${id=>{setSearchOpen(false);setMode('all');requestAnimationFrame(()=>requestAnimationFrame(()=>{const target=Array.from(document.querySelectorAll('.cm-video[data-matchplay-post]')).find(el=>el.dataset.matchplayPost===String(id));if(target)target.scrollIntoView({block:'start',behavior:'instant'})}))}}/>\`}\n`+anchor);
fs.writeFileSync(f,s);
fs.appendFileSync('client/src/features/settings/appearance.css',`
.mp-search-tools{display:flex;align-items:center;justify-self:end;grid-column:3;grid-row:1;gap:2px;pointer-events:auto}
.mp-search-tools .mn-gear-video{width:40px;height:44px;grid-column:auto;grid-row:auto;padding:5px}
.mp-search-trigger{width:32px;height:44px;display:grid;place-items:center;border:0;background:transparent;color:#fff;cursor:pointer;padding:0;filter:drop-shadow(0 1px 3px #000a);pointer-events:auto}
.mp-search-screen{position:absolute;inset:0;z-index:8;background:#fff;color:#18283a;display:flex;flex-direction:column;overflow:hidden;text-shadow:none;padding-top:env(safe-area-inset-top,0px)}
[data-matchter-theme=dark] .mp-search-screen{background:#000;color:#fff}
.mp-search-header{display:flex;align-items:center;gap:8px;padding:12px 10px;border-bottom:1px solid var(--line)}
.mp-search-header>button,.mp-search-input button{display:grid;place-items:center;background:none;border:0;color:inherit;padding:4px;cursor:pointer}
.mp-search-input{display:flex;align-items:center;gap:7px;background:#f2f3f5;border-radius:10px;flex:1;min-width:0;padding:8px 10px;color:#687587}
.mp-search-input input{min-width:0;flex:1;width:100%;background:transparent!important;border:0!important;color:inherit;font-size:13px;outline:none}
.mp-search-input input::-webkit-search-cancel-button{display:none}
[data-matchter-theme=dark] .mp-search-input{background:#222;color:#eee}
.mp-search-tabs{display:flex;justify-content:space-around;border-bottom:1px solid var(--line)}
.mp-search-tabs button{padding:12px 14px;background:none;border:0;border-bottom:2px solid transparent;color:inherit;font-size:13px;cursor:pointer}
.mp-search-tabs .selected{font-weight:700;border-color:currentColor}
.mp-search-results{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:18px}
.mp-search-results h3{margin:5px 0 12px;font-size:15px}.mp-search-results h3 small{font-weight:400;color:#89919b;font-size:12px}
.mp-search-suggestions p,.mp-search-empty{font-size:13px;color:#89919b}.mp-search-suggestions>div{display:flex;flex-wrap:wrap;gap:7px}.mp-search-suggestions button{border:1px solid var(--line);background:var(--card);color:var(--tx);border-radius:20px;padding:7px 10px;display:flex;align-items:center;gap:5px;cursor:pointer}
.mp-search-person{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;color:inherit;border:0;border-bottom:1px solid var(--line);padding:10px 0;cursor:pointer}
.mp-search-avatar{width:44px;height:44px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#ddd;color:#555;flex:none}.mp-search-avatar img{width:100%;height:100%;object-fit:cover}.mp-search-person>span:nth-child(2){flex:1;min-width:0}.mp-search-person small,.mp-search-video small{display:block;font-size:11px;color:#89919b;line-height:1.3;margin-top:4px}
.mp-search-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 8px}.mp-search-video{border:0;background:none;text-align:left;padding:0;color:inherit;cursor:pointer;min-width:0}.mp-search-preview{aspect-ratio:3/4;background:#171717;border-radius:8px;position:relative;overflow:hidden;display:grid;place-items:center;color:white;margin-bottom:5px}.mp-search-preview video{width:100%;height:100%;object-fit:cover;pointer-events:none}.mp-search-preview span{position:absolute;bottom:8px;left:8px;filter:drop-shadow(0 1px 2px black)}.mp-search-video b{font-size:12px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
@media(max-width:360px){.mp-search-tools{gap:0}.mp-search-trigger{width:26px}.mp-search-tools .mn-gear-video{width:32px}.mp-search-trigger svg{width:21px}.mp-search-tools .mn-gear-video svg{width:25px}}
`);
console.log('BETA: MATCHPLAY search added alongside settings, with profile and video results, accent-insensitive queries, and selected-video navigation.');
})();