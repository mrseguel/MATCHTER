(function(){
const fs=require('node:fs'),once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor '+a);return s.replace(a,b)};
const path='client/src/features/settings/Appearance.jsx';let s=fs.readFileSync(path,'utf8');
s=once(s,'SettingsGear({onWallet,onClick,video=false})','SettingsGear({onClick,video=false})');
s=once(s,"[SettingsWalletIcon,'Wallet',onWallet],","[SettingsWalletIcon,'Wallet'],");
s=once(s,'SettingsPanel({mode,setMode,onProfile,onLogout})','SettingsPanel({mode,setMode,onProfile,onLogout,onWallet})');
s=once(s,"const active=title==='Mi cuenta'&&i===0;","const active=title==='Mi cuenta'&&['Editar datos personales','Wallet'].includes(label);");
s=once(s,'onClick={active?onProfile:undefined}',"onClick={active?(label==='Wallet'?onWallet:onProfile):undefined}");
fs.writeFileSync(path,s);
const app='client/src/App.jsx';let a=fs.readFileSync(app,'utf8');a=once(a,'<${SettingsGear} onWallet=${()=>goTab("wallet")}','<${SettingsGear}');a=once(a,'<${SettingsPanel}','<${SettingsPanel} onWallet=${()=>goTab("wallet")}');fs.writeFileSync(app,a);console.log('FIX: Wallet handler now owned by SettingsPanel; both account entries enabled.');
})();