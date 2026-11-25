(function(){
const fs=require('node:fs'),update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)},once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a);return s.replace(a,b)};
let panelName;
update('client/src/features/settings/Appearance.jsx',s=>{
const i=s.indexOf("'Mi cuenta'");if(i<0)throw Error('Account group missing');
console.log('Account settings group: '+s.slice(Math.max(0,i-450),i+700));
const before=s.slice(0,i),matches=[...before.matchAll(/export function\s+(\w+)\s*\(\s*\{([^}]+)\}\s*\)/g)],m=matches.at(-1);
if(!m)throw Error('Settings component not found');
panelName=m[1];
s=once(s,m[0],m[0].replace('({','({onWallet,'));
s=once(s,"from 'lucide-react';","from 'lucide-react';\nimport {Wallet as SettingsWalletIcon} from 'lucide-react';");
const group=/(['"]Mi cuenta['"]\s*,\s*\[)/;
if(!group.test(s))throw Error('Account group format missing');
s=s.replace(group,"$1[SettingsWalletIcon,'Wallet',onWallet],");
return s;
});
update('client/src/App.jsx',s=>{
s=once(s,"employment:'MATCHTER Empleos'","employment:'Empleos'");
const start='<${'+panelName+'}';
if(s.split(start).length!==2)throw Error('Settings render missing '+start);
s=s.replace(start,start+' onWallet=${()=>goTab("wallet")}');
return s;
});
console.log('BETA: Wallet shortcut in Mi cuenta and single MATCHTER Empleos heading.');
})();