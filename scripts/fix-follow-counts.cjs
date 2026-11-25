const fs=require('node:fs');
const base='client/src/features/community/';
const cp=base+'Community.jsx', pp=base+'MatchplayPublicProfile.jsx', css=base+'matchplay-public-profile.css';
function once(s,x,y,label){const i=s.indexOf(x);if(i<0||s.indexOf(x,i+x.length)>=0)throw Error('Unexpected '+label);return s.slice(0,i)+y+s.slice(i+x.length)}
let c=fs.readFileSync(cp,'utf8'),p=fs.readFileSync(pp,'utf8');
const start='<${MatchplayPublicProfile} author=${author}';
c=once(c,start,start+' followCounts=${getFollowCounts(follows,author.id)}','public profile props');
c='import {getFollowCounts} from "./followCounts.js";\n'+c;
p=once(p,'{author,posts,isProvider,','{author,posts,followCounts,isProvider,','public profile parameters');
p=once(p,'</h2>\n <div className="mp-role">','</h2>\n <div className="mp-follow-counts" aria-label="Seguimientos"><div><strong>{followCounts.followers.toLocaleString("es-CL")}</strong><span>Seguidores</span></div><div><strong>{followCounts.following.toLocaleString("es-CL")}</strong><span>Siguiendo</span></div></div>\n <div className="mp-role">','profile name');
fs.writeFileSync(cp,c);fs.writeFileSync(pp,p);
fs.appendFileSync(css,'\n.mp-follow-counts{display:flex;align-items:center;justify-content:center;gap:30px;margin:3px 0 2px}.mp-follow-counts>div{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:72px}.mp-follow-counts strong{font-size:15px;line-height:1.2;font-weight:700;color:#171717}.mp-follow-counts span{font-size:11px;line-height:1.25;color:#67717f}\n');
console.log('MATCHTER: follower/following counts wired to the existing follow graph; no unrelated screens changed.');
