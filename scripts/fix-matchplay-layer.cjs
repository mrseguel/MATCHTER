const fs=require('node:fs');
const css='client/src/features/community/matchplay-public-profile.css';
fs.appendFileSync(css,'\n/* Keep the public profile behind application-level professional overlays. */\n.cm{isolation:isolate}\n');
const p='client/src/features/community/MatchplayPublicProfile.jsx';
const s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,s.replaceAll(String.fromCharCode(92,92)+'n',String.fromCharCode(92)+'n'));
const app=fs.readFileSync('client/src/App.jsx','utf8');
const community=fs.readFileSync('client/src/features/community/Community.jsx','utf8');
if(!community.includes('MatchplayPublicProfile')||!app.includes('onOpenProfile'))throw Error('MATCHPLAY profile route not wired');
console.log('MATCHTER: public profile stacking isolated; professional overlay remains above the feed.');