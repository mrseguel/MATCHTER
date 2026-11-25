const fs=require('node:fs');
const app='client/src/App.jsx',css='client/src/features/community/matchplay-public-profile.css',cp='client/src/features/community/Community.jsx';
let a=fs.readFileSync(app,'utf8'),c=fs.readFileSync(cp,'utf8');
const start=a.indexOf('const NAV=['),end=a.indexOf("['contratos'",start);
if(start<0||end<0||!a.slice(start,end).includes("'videos'"))throw Error('Unexpected bottom nav');
a=a.slice(0,start)+"const NAV=[['videos',null,'MATCHPLAY'],"+a.slice(end);
const old='<span>${i}</span>${l}';
if(a.split(old).length!==2)throw Error('Unexpected navigation label');
a=a.replace(old,"${k==='videos'?html`<span className=\"matchplay-nav-wordmark\">MATCHPLAY</span>`:html`<${React.Fragment}><span>${i}</span>${l}<//>`}");
/* The nested htm template must close before the interpolation. */
fs.writeFileSync(app,a);
const followStart=c.indexOf("className=\"cm-follow-top\"");
if(followStart<0)throw Error('Follow control missing');
const headerStart=c.indexOf('<div className="cm-brand-row">');
if(headerStart<0)throw Error('Brand row missing');
/* Keep the header gradient behind the per-video follow control. The header itself is transparent except for a background gradient now placed at video level. */
fs.appendFileSync(css,'\n.cm-overlay-header{background:none!important}.cm-video:after{content:"";position:absolute;inset:0 0 auto;height:94px;background:linear-gradient(#0006,transparent);pointer-events:none;z-index:2}.cm-video .cm-follow-top{z-index:5!important;pointer-events:auto}.community-nav button:first-child{background:#000;color:#fff!important;border-radius:7px;flex:1.65;min-width:0;align-self:stretch;justify-content:center;padding:5px 2px;margin:0 3px 0 5px}.community-nav button:first-child .matchplay-nav-wordmark{display:block;color:#fff;font-size:clamp(9px,2.65vw,14px);font-weight:500;letter-spacing:0;line-height:1.25;white-space:nowrap;text-shadow:0 1px 4px #0008}.community-nav button:first-child:focus-visible{outline:2px solid var(--o);outline-offset:2px}\n');
console.log('MATCHTER: follow control above video gradient, black MATCHPLAY navigation wordmark.');
