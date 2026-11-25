(function(){
 const fs=require('node:fs'),f='client/src/App.jsx';let s=fs.readFileSync(f,'utf8');
 const anchor="const [tab, setTab] = useState('explorar')";
 if(s.split(anchor).length!==2)throw Error('Tab state anchor missing');
 s=s.replace(anchor,anchor+"\n  const [filterHint,setFilterHint]=useState(false)\n  useEffect(()=>{if(!account||tab!=='explorar'){setFilterHint(false);return}setFilterHint(true);const timer=setTimeout(()=>setFilterHint(false),3000);return()=>clearTimeout(timer)},[account,tab])");
 const old='<button className="chip mn-filter"';
 if(s.split(old).length!==2)throw Error('Explore filter anchor missing');
 s=s.replace(old,'<button className=${"chip mn-filter"+(filterHint?" mn-filter-intro":"")}');
 fs.writeFileSync(f,s);
 fs.appendFileSync('client/src/features/settings/appearance.css',`
/* Slightly wider Explore filter, with an introductory label opening to the right. */
.discover-centered-header .mn-head-left>.mn-filter{width:46px!important;min-width:46px!important;padding:0 6px;gap:3px;overflow:visible}
.discover-centered-header .mn-filter .mn-gear-tip{position:absolute;display:block;top:50%;bottom:auto;left:calc(100% + 9px);right:auto;transform:translate(-5px,-50%);opacity:0;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility .18s;pointer-events:none;z-index:30;white-space:nowrap}
.discover-centered-header .mn-filter .mn-gear-tip:before{content:"";position:absolute;top:calc(50% - 4px);left:-5px;width:8px;height:8px;background:inherit;border-left:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;transform:rotate(45deg)}
[data-matchter-theme=dark] .discover-centered-header .mn-filter .mn-gear-tip:before{border-color:#444}
.discover-centered-header .mn-filter.mn-filter-intro .mn-gear-tip,.discover-centered-header .mn-filter:hover .mn-gear-tip,.discover-centered-header .mn-filter:focus-visible .mn-gear-tip{opacity:1;visibility:visible;transform:translate(0,-50%)}
@media(max-width:360px){.discover-centered-header .mn-head-left>.mn-filter{width:42px!important;min-width:42px!important}}
@media(prefers-reduced-motion:reduce){.discover-centered-header .mn-filter .mn-gear-tip{transition:none}}
`);
 console.log('BETA: slightly wider filter and 3-second right-side hint on each Explore entry; existing hover label retained.');
})();