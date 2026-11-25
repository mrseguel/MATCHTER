const fs = require('node:fs');
const ap='client/src/App.jsx';let a=fs.readFileSync(ap,'utf8');
const pro=/<\$\{ProView\}\s[\s\S]*?\/>/g;
const portfolio=/<\$\{Overlay\}\s+title="Portafolio"[\s\S]*?<\/\/>/g;
const matches=[...a.matchAll(pro)], portfolios=[...a.matchAll(portfolio)];
console.log('MATCHTER actual profile render:',matches.map(x=>x[0]).join(' ').slice(0,1000));
console.log('MATCHTER actual portfolio render:',portfolios.map(x=>x[0]).join(' ').slice(0,1000));
if(matches.length!==1||portfolios.length!==1)throw Error('Unexpected profile rendering');
const active='active=${tab===\'explorar\'&&role===\'Cliente\'}';
function shell(p,back,child){return '<${ExploreProfileShell} '+active+' profile=${'+p+'} saved=${saved} onAction=${action=>{setView(null);act('+p+',action)}} '+back+'>'+child+'<//>';}
a=a.replace(pro,m=>shell('vp','onBack=${()=>setView(null)}',m));
a=a.replace(portfolio,m=>shell('profileById(view.id)','fallbackBack=${()=>setView(null)}',m));
a='import { ExploreProfileShell } from "./features/portfolio/ExploreProfileShell.jsx";\n'+a;
fs.writeFileSync(ap,a);
console.log('MATCHTER: existing profile and portfolio wrapped; explore back and all three actions bound to existing handlers.');