(function(){
 const fs=require('node:fs');const file='client/src/App.jsx',css='client/src/features/community/matchplay-public-profile.css';
 let s=fs.readFileSync(file,'utf8');
 const old='<div className="nav community-nav">${NAV.map(';
 const next='<div className=${"nav community-nav"+(tab==="videos"?" matchplay-dark-nav":"")}>${NAV.filter(([k])=>tab!=="videos"||k!=="videos").map(';
 if(s.split(old).length!==2)throw Error('Navigation anchor missing');
 s=s.replace(old,next);fs.writeFileSync(file,s);
 fs.appendFileSync(css,`
/* MATCHPLAY feed: six equal navigation items, no featured button or its styling. */
.community-nav.matchplay-dark-nav{grid-template-columns:repeat(6,minmax(0,1fr));background:#000!important;border-top:1px solid #252525;align-items:center;column-gap:0;color:#fff;padding-top:8px;padding-bottom:max(8px,env(safe-area-inset-bottom));flex-shrink:0}
.community-nav.matchplay-dark-nav button:nth-child(n){box-sizing:border-box!important;background:transparent!important;color:#fff!important;border:0;border-radius:0!important;box-shadow:none!important;display:flex;flex-direction:column;align-items:center;justify-content:center;justify-self:stretch;align-self:center;flex:1!important;width:auto!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:38px!important;max-height:none!important;aspect-ratio:auto;margin:0!important;padding:0 1px!important;gap:2px;z-index:auto;font-size:10px;font-weight:400}
.community-nav.matchplay-dark-nav button:nth-child(n) span{color:inherit;font-size:20px;line-height:normal}
.community-nav.matchplay-dark-nav button:nth-child(n) svg{color:#fff!important}
.community-nav.matchplay-dark-nav button:nth-child(n):focus-visible{outline:2px solid #fff;outline-offset:-2px;border-radius:4px!important}
.community-nav.matchplay-dark-nav .badge{background:#fff;color:#000}
@media(max-width:360px){.community-nav.matchplay-dark-nav button:nth-child(n){font-size:9px}}
@media(max-height:620px){.community-nav.matchplay-dark-nav button:nth-child(n) span{font-size:17px}}
`);
 console.log('BETA: MATCHPLAY-only black six-item navigation; standard seven-item navigation outside feed.');
})();