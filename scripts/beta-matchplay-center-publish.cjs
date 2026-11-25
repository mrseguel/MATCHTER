(function(){
 const fs=require('node:fs');
 const update=(f,fn)=>{let s=fs.readFileSync(f,'utf8');s=fn(s);fs.writeFileSync(f,s)};
 const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Expected one anchor: '+a.slice(0,130));return s.replace(a,b)};
 update('client/src/features/settings/Appearance.jsx',s=>{
 s=once(s,'Compass,FileText,Calculator,Play,MessageCircle','Compass,FileText,Calculator,Play,Plus,MessageCircle');
 s=once(s,'goTab,messageCount=0,children','goTab,onPublish,messageCount=0,children');
 s=once(s,"items.filter(([k])=>!video||k!=='videos').map(([k,Icon,label])=>{","items.map(([k,BaseIcon,baseLabel])=>{\n const publish=video&&k==='videos',Icon=publish?Plus:BaseIcon,label=publish?'Publicar video':baseLabel;");
 s=once(s,"const active=tab===k||","const active=!publish&&(tab===k||");
 s=once(s,"['wallet','trabajos','solicitudes'].includes(tab);","['wallet','trabajos','solicitudes'].includes(tab));");
 s=once(s,"(k==='videos'?' mn-play':'')","(publish?' mn-publish':k==='videos'?' mn-play':'')");
 s=once(s,"setTip(null);goTab(k)","setTip(null);if(publish){onPublish?.();return}goTab(k)");
 s=once(s,"size={k==='videos'?26:23} strokeWidth={1.8} fill={k==='videos'?'currentColor':'none'}","size={publish?30:k==='videos'?26:23} strokeWidth={publish?2.5:1.8} fill={k==='videos'&&!publish?'currentColor':'none'}");
 return s;
 });
 update('client/src/App.jsx',s=>{
 s=once(s,'const [appearance,setAppearance]=useAppearance()','const [appearance,setAppearance]=useAppearance()\n  const [matchplayPublishSignal,setMatchplayPublishSignal]=useState(0)');
 s=once(s,'<${IconNavigation} tab=${tab}','<${IconNavigation} onPublish=${()=>{setView(null);setMatchplayPublishSignal(n=>n+1)}} tab=${tab}');
 s=once(s,'<${Community} onSettings=','<${Community} publishSignal=${matchplayPublishSignal} onSettings=');
 return s;
 });
 update('client/src/features/community/Community.jsx',s=>{
 s=once(s,'export function Community({onSettings,','export function Community({publishSignal=0,onSettings,');
 const old='<button className="cm-options cm-publish-overlay" aria-label="Publicar video" onClick=${()=>show({type:\'upload\'})}><span>Publicar</span></button>';
 const search='<button className="mp-search-trigger" aria-label="Buscar en MATCHPLAY" title="Buscar" onClick=${()=>{close();setSearchOpen(true)}}><${MatchplaySearchIcon} size=${25}/></button>';
 const tools='<div className="mp-search-tools">'+search+'<${SettingsGear} video=${true} onClick=${onSettings}/></div>';
 s=once(s,tools,'<${SettingsGear} video=${true} onClick=${onSettings}/>');
 s=once(s,old,search);
 const anchor="const show=p=>{setPanel(p);setDraft('');setError('');setShareNotice('')}";
 s=once(s,anchor,anchor+"\n const seenPublish=useRef(publishSignal)\n useEffect(()=>{if(publishSignal!==seenPublish.current){seenPublish.current=publishSignal;setSearchOpen(false);show({type:'upload'})}},[publishSignal])");
 return s;
 });
 fs.appendFileSync('client/src/features/settings/appearance.css',`
/* MATCHPLAY: search in the former upper-left publish slot; publishing lives in the center of the bottom menu. */
.mn-nav.mn-video{grid-template-columns:repeat(3,minmax(0,1fr)) 60px repeat(3,minmax(0,1fr))}
.mn-video .mn-item.mn-publish{width:48px;height:34px;border-radius:10px;background:#fff;color:#000;box-shadow:none;padding:0;min-height:0}
.mn-video .mn-item.mn-publish>svg{width:27px;height:27px}
.mn-video .mn-item.mn-publish .mn-tooltip{background:#fff;color:#18283a;border-color:#e5e7eb}
.mn-video .mn-item.mn-publish .mn-tooltip:after{border-color:#e5e7eb}
.cm-brand-row>.mp-search-trigger{grid-column:1;grid-row:1;justify-self:start;width:44px;height:44px;pointer-events:auto!important;color:#fff}
.cm-brand-row>.mp-search-trigger svg{width:27px;height:27px}
.cm-brand-row>.mn-gear-video{grid-column:3;grid-row:1;justify-self:end}
@media(max-width:360px){.mn-nav.mn-video{grid-template-columns:repeat(3,minmax(0,1fr)) 50px repeat(3,minmax(0,1fr))}.mn-video .mn-item.mn-publish{width:42px;height:33px}.cm-brand-row>.mp-search-trigger{width:36px}}
`);
 console.log('BETA: MATCHPLAY search left, settings right, centered publish plus opens original upload form; normal navigation unchanged.');
})();