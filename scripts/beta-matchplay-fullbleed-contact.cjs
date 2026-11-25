(function(){
 const fs=require('node:fs'),f='client/src/features/community/Community.jsx';let s=fs.readFileSync(f,'utf8');
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Missing anchor: '+a.slice(0,120));s=s.replace(a,b)};
 const start=s.indexOf('${mayHire(role,me,p.author,profiles)&&html`<button className="cm-contact"'),end=s.indexOf('</div><small>',start);
 if(start<0||end<0||!s.slice(start,end).includes('service:true'))throw Error('Contact button missing');
 s=s.slice(0,start)+s.slice(end);
 once('<button aria-label="Mensaje privado" onClick=${()=>show({type:\'message\',author:p.author})}><${Send}/><small>Mensaje</small></button>','<button aria-label="Contactar" onClick=${()=>show({type:\'message\',author:p.author,service:mayHire(role,me,p.author,profiles)})}><${Send}/><small>Contactar</small></button>');
 fs.writeFileSync(f,s);
 const app='client/src/App.jsx';let a=fs.readFileSync(app,'utf8');const old='return html`<div className="app">';if(a.split(old).length!==2)throw Error('App shell missing');a=a.replace(old,'return html`<div className=${"app"+(tab==="videos"?" matchplay-fullbleed":"")}>');fs.writeFileSync(app,a);
 fs.appendFileSync('client/src/features/settings/appearance.css',`
/* Full-bleed video only in MATCHPLAY; maintain all upper control offsets. */
:root:has(.matchplay-fullbleed){padding-top:0!important;background:#000}
:root:has(.matchplay-fullbleed) body{background:#000}
.matchplay-fullbleed{background:#000;isolation:isolate}
.matchplay-fullbleed .community-main,.matchplay-fullbleed .community-mount,.matchplay-fullbleed .cm{background:#000!important;padding:0!important;margin:0!important;border:0!important}
.matchplay-fullbleed .cm{position:relative;min-height:0;height:100%;--cm-safe-top:env(safe-area-inset-top,0px)}
.matchplay-fullbleed .cm-feed{position:absolute!important;inset:0!important;width:100%;height:100%!important;margin:0!important;padding:0!important;background:#000!important;overflow-y:auto}
.matchplay-fullbleed .cm-video{position:relative;height:100%!important;min-height:0!important;width:100%;padding:0!important;margin:0!important;background:#000!important}
.matchplay-fullbleed .cm-video>video{position:absolute!important;inset:0!important;display:block;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;background:#000!important}
.matchplay-fullbleed .cm-overlay-header{position:absolute!important;inset:0 0 auto!important;margin:0!important;padding-top:calc(var(--cm-top,14px) + var(--cm-safe-top))!important;background:transparent!important;z-index:3}
.matchplay-fullbleed .cm-video:after{height:calc(var(--cm-top,14px) + var(--cm-safe-top) + 100px)!important;pointer-events:none!important}
.matchplay-fullbleed .cm-overlay-header .mn-gear-video{pointer-events:auto!important}
.matchplay-fullbleed .cm-brand-row .cm-publish-overlay{pointer-events:auto!important}
.matchplay-fullbleed .cm-actions{z-index:4}
.matchplay-fullbleed .cm-actions small{white-space:nowrap}
`);
 console.log('BETA: immersive MATCHPLAY video covers entire feed including top safe area; contact action consolidated into paper-plane button, retaining hiring eligibility.');
})();