(function(){
 const fs=require('node:fs'),f='client/src/App.jsx';let s=fs.readFileSync(f,'utf8');
 const start=s.indexOf('<div className="mn-head-left"><button'),end=s.indexOf('</button>',start);
 if(start<0||end<0)throw Error('Main left controls missing');
 const button=s.slice(start+'<div className="mn-head-left">'.length,end+9);
 if(!button.includes('setAccount(null)'))throw Error('Expected original home-exit button: '+button);
 // Eliminate the authenticated root-page shortcut to the landing page, but preserve genuine nested-page back navigation.
 s=s.slice(0,start)+'<div className="mn-head-left">${["trabajos","wallet"].includes(tab)?html`'+button.replace(/onClick=\$\{[\s\S]*?\}>(?=[^<]*<\/button>)/,'onClick=${()=>goTab("perfil")}>')+'`:null}'+s.slice(end+9);
 fs.writeFileSync(f,s);
 console.log('BETA: no direct landing shortcut from authenticated root screens; Explore retains Filters on left; nested profile pages retain back navigation.');
})();