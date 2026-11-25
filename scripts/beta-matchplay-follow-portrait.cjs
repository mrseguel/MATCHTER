(function(){
 const fs=require('node:fs'),root='client/src/features/community/';
 const update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)};
 const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,120));return s.replace(a,b)};
 update(root+'Community.jsx',s=>{
 s='import {FollowPortrait} from "./FollowPortrait.jsx";\n'+s;
 const start=s.indexOf('${!own&&html`<button className="cm-follow-top"'),end=s.indexOf('<div className="cm-caption">',start);
 if(start<0||end<0||!s.slice(start,end).includes('toggleMember'))throw Error('Follow button anchor missing');
 s=s.slice(0,start)+s.slice(end);
 s=once(s,'<div className="cm-actions"><button aria-label="Me gusta video"','<div className="cm-actions"><${FollowPortrait} person=${a} following=${following} canFollow=${!own&&!!a} onProfile=${()=>show({type:"author",author:p.author})} onFollow=${()=>setFollows(f=>({...f,[me]:toggleMember(f[me]||[],identity(p.author))}))}/><button aria-label="Me gusta video"');
 s=once(s,'<${MatchplayPublicProfile} author=${author}', '<${MatchplayPublicProfile} author=${author} following=${followed.includes(identity(author.id))} canFollow=${identity(author.id)!==me} onFollow=${()=>setFollows(f=>({...f,[me]:toggleMember(f[me]||[],identity(author.id))}))}');
 return s;
 });
 update(root+'MatchplayPublicProfile.jsx',s=>{
 s='import {FollowPortrait} from "./FollowPortrait.jsx";\n'+s;
 s=once(s,'function MatchplayPublicProfile({','function MatchplayPublicProfile({following,canFollow,onFollow,');
 // Identify the exact photo expression structurally so the existing portrait wrapper and layout stay intact.
 const parser=require('@babel/parser'),ast=parser.parse(s,{sourceType:'module',plugins:['jsx']});let target;
 function walk(node,parents=[]){if(!node||typeof node!=='object')return;if(node.type==='JSXElement'&&node.openingElement.name.name==='img'&&node.openingElement.attributes.some(a=>a.name?.name==='src'&&a.value?.expression?.name==='photo')){target=[...parents].reverse().find(x=>x.type==='JSXExpressionContainer'&&x.expression?.type==='ConditionalExpression'&&x.expression.test?.name==='photo');if(!target)throw Error('Profile image conditional not found');}for(const [k,v] of Object.entries(node)){if(['loc','start','end','extra','comments'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>walk(x,[...parents,node]));else if(v&&typeof v==='object')walk(v,[...parents,node]);}}
 walk(ast);if(!target)throw Error('Profile portrait missing');
 console.log('Replacing portrait expression: '+s.slice(target.start,target.end));
 s=s.slice(0,target.start)+'<FollowPortrait person={author} photo={photo} following={following} canFollow={canFollow} onFollow={onFollow} variant="profile"/>'+s.slice(target.end);
 return s;
 });
 update('client/src/App.jsx',s=>once(s,"active=\${tab==='videos'} actor=","active=\${tab==='videos'&&view?.t!=='settings'} actor="));
 fs.appendFileSync('client/src/features/settings/appearance.css',`
/* The feed header disables pointer events by design; explicitly re-enable its settings control. */
.cm-overlay-header .mn-gear-video{pointer-events:auto!important;position:relative;grid-column:3;grid-row:1;justify-self:end;align-self:center;width:44px;height:44px;padding:6px;z-index:6;color:#fff;filter:drop-shadow(0 1px 3px #000a)}
.cm-overlay-header .mn-gear-video svg{width:29px;height:29px;stroke-width:1.8}
.cm-overlay-header .mn-gear-video .mn-gear-tip{pointer-events:none}
`);
 fs.appendFileSync(root+'matchplay-public-profile.css',`
/* Shared follow state, with the follow control separate from the profile-link target. */
.mp-follow-portrait{position:relative;display:grid;place-items:center;flex:none;overflow:visible;isolation:isolate}
.mp-follow-feed{width:48px;height:56px;margin:0 0 3px}
.mp-follow-portrait .mp-follow-image,.cm-actions .mp-follow-portrait .mp-follow-image{width:46px;height:46px;min-width:0;min-height:0;padding:0;display:grid;place-items:center;border:2px solid white;border-radius:50%;background:#202020;color:#fff;overflow:hidden;box-shadow:0 2px 7px #0005}
.mp-follow-portrait .mp-follow-image img{display:block;width:100%;height:100%;object-fit:cover;border:0;border-radius:50%}
.mp-follow-portrait .mp-follow-plus,.cm-actions .mp-follow-portrait .mp-follow-plus{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:22px;height:22px;min-width:0;min-height:0;padding:0;display:grid;place-items:center;border:1.5px solid #fff;border-radius:50%;background:#000;color:#fff;cursor:pointer;box-shadow:0 1px 4px #0004;z-index:2}
[data-matchter-theme=dark] .mp-follow-portrait .mp-follow-plus{background:#fff!important;color:#000!important;border-color:#000!important}
.mp-follow-portrait .mp-follow-plus svg,.cm-actions .mp-follow-plus svg{width:14px;height:14px}
.mp-public :has(>.mp-follow-profile){overflow:visible!important}
.mp-follow-profile{width:100%;height:100%;min-width:72px;min-height:72px}
.mp-follow-profile .mp-follow-image{width:100%;height:100%;min-height:72px;aspect-ratio:1;border:0;background:#e7eaee;box-shadow:none}
.mp-follow-profile .mp-follow-image img{width:100%;height:100%;object-fit:cover}
.mp-follow-profile .mp-follow-plus{left:auto;right:0;bottom:0;transform:none;width:27px;height:27px;border:2px solid #fff}
.mp-follow-profile .mp-follow-plus svg{width:17px;height:17px}
.cm-actions .mp-follow-portrait button:focus-visible,.mp-follow-plus:focus-visible{outline:2px solid #ff5a00;outline-offset:2px}
@media(max-height:620px){.mp-follow-feed{height:46px;width:40px}.mp-follow-feed .mp-follow-image,.cm-actions .mp-follow-feed .mp-follow-image{width:38px;height:38px}}
`);
 console.log('BETA: fixed MATCHPLAY settings pointer events, moved follow to video and profile portraits, shared existing follow state.');
})();