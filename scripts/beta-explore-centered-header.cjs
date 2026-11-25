(function(){
const fs=require('node:fs'),f='client/src/App.jsx';let s=fs.readFileSync(f,'utf8');
const start=s.indexOf('<div className="hd"><button className="chip" style=${{width:44}}');
if(start<0)throw Error('Main header missing');
const end=s.indexOf('</div></div>`}',start);
if(end<0)throw Error('Header end missing');
const old=s.slice(start,end+12);
const filterStart=old.indexOf('<button className="chip mn-filter"');
const filterEnd=old.indexOf('</button>',filterStart);
if(filterStart<0||filterEnd<0)throw Error('Filter button missing: '+old);
const filter=old.slice(filterStart,filterEnd+9);
let header=old.replace(filter,'<span style=${{width:44}}></span>');
const backEnd=header.indexOf('</button>')+9;
if(backEnd<9)throw Error('Back button missing');
header=header.slice(0,backEnd)+'${tab==="explorar"?html`'+filter+'`:null}</div>'+header.slice(backEnd);
header=header.replace('<div className="hd"><button','<div className=${"hd"+(tab==="explorar"?" discover-centered-header":"")}><div className="mn-head-left"><button');
// Avoid duplicating the explore spacer; balance both groups only in Explore.
header=header.replace('tab===\'explorar\'?html`<span style=${{width:44}}></span>`:','tab===\'explorar\'?null:');
if(!header.includes('discover-centered-header')||!header.includes('mn-filter')||!header.includes('mn-head-left'))throw Error('Invalid header patch');
s=s.slice(0,start)+header+s.slice(end+12);fs.writeFileSync(f,s);
fs.appendFileSync('client/src/features/settings/appearance.css',`
/* Explore: balanced controls on either side of the centered brand. */
.mn-head-left{display:flex;align-items:center;gap:3px}
.discover-centered-header{display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:4px}
.discover-centered-header>.mn-head-left{justify-self:start;min-width:0}
.discover-centered-header>.mn-head-tools{justify-self:end;min-width:0}
.discover-centered-header>.logo{text-align:center;justify-self:center;display:flex;flex-direction:column;align-items:center;line-height:1.1;white-space:nowrap}
.discover-centered-header>.logo small{margin:3px 0 0;padding:0;border:0;line-height:1.15}
.discover-centered-header .mn-head-left>.chip{width:32px!important;min-width:32px!important;height:36px;padding:0;display:flex;align-items:center;justify-content:center;position:relative}
.discover-centered-header .mn-filter .mn-gear-tip{left:0;right:auto}
@media(max-width:360px){.discover-centered-header{padding-inline:8px;column-gap:2px}.discover-centered-header .mn-head-left>.chip{width:30px!important;min-width:30px!important}.discover-centered-header .mn-head-left{gap:2px}}
`);
console.log('BETA: Explore filter moved beside back button; brand centered between left and right control groups.');
})();